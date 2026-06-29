const prisma = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const SUPER_ADMIN_ROLE = 'SuperAdmin';
const REGEX_ESCAPE_PATTERN = /[.+?^${}()|[\]\\]/g;
const REGEX_ESCAPE_REPLACEMENT = String.raw`\$&`;

/**
 * Safely matches a pattern (supporting *) against a value.
 * Prevents ReDoS by limiting pattern length and complexity.
 */
function matchPattern(pattern, value) {
    if (pattern === '*') return true;
    if (pattern.length > 100) return pattern === value; // Safety limit

    const escapedPattern = pattern
        .replaceAll(REGEX_ESCAPE_PATTERN, REGEX_ESCAPE_REPLACEMENT)
        .replaceAll('*', '.*');

    try {
        const regex = new RegExp(`^${escapedPattern}$`, 'i');
        return regex.test(value);
    } catch {
        return pattern === value; // Fallback to exact match on invalid regex
    }
}

function matchesPolicy(policy, action, resource) {
    const isActionMatch = policy.actions.some((policyAction) => matchPattern(policyAction, action));
    const isResourceMatch = policy.resources.some((policyResource) => matchPattern(policyResource, resource));

    return isActionMatch && isResourceMatch;
}

function splitPoliciesByEffect(policies) {
    return policies.reduce(
        (accumulator, policy) => {
            const target = policy.effect === 'DENY' ? accumulator.denyPolicies : accumulator.allowPolicies;
            target.push(policy);
            return accumulator;
        },
        { allowPolicies: [], denyPolicies: [] }
    );
}

function extractUniqueRoles(userRoles, userGroups) {
    const roleMap = new Map();
    const addRole = (role) => { if (role) roleMap.set(role.id, role); };

    userRoles.forEach((ur) => addRole(ur.role));
    userGroups.forEach((ug) => ug.group?.groupRoles?.forEach((gr) => addRole(gr.role)));

    return roleMap;
}

function extractPolicies(roleMap) {
    const policyMap = new Map();

    roleMap.forEach((role) => {
        role.rolePolicies?.forEach((rp) => {
            if (rp.policy) policyMap.set(rp.policy.id, rp.policy);
        });
    });

    return Array.from(policyMap.values()).map((p) => ({
        id: p.id,
        name: p.name,
        effect: p.effect,
        actions: p.actions,
        resources: p.resources,
    }));
}

function isUserSuperAdmin(userRoles, userGroups) {
    const check = (role) => role?.name?.toLowerCase() === SUPER_ADMIN_ROLE.toLowerCase();
    
    if (userRoles.some((ur) => check(ur.role))) return true;
    return userGroups.some((ug) => ug.group?.groupRoles?.some((gr) => check(gr.role)));
}

/**
 * Fetches all roles and policies for a user in a reliable, decomposed sequence.
 * Avoids deep nesting that causes 'column not available' errors with some DB adapters.
 */
async function fetchFullUserAccessContext(userId) {
    // 1. Fetch direct roles and their policies + user's groups in parallel
    const [directUserRoles, userGroups] = await Promise.all([
        prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        rolePolicies: {
                            include: {
                                policy: true
                            }
                        }
                    }
                }
            }
        }),
        prisma.userGroup.findMany({
            where: { userId },
            select: {
                groupId: true,
                group: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            }
        }),
    ]);

    const groupIds = userGroups.map((ug) => ug.groupId);

    // 3. Fetch roles attached to those groups and their policies
    const groupRoles = groupIds.length > 0
        ? await prisma.groupRole.findMany({
            where: { groupId: { in: groupIds } },
            include: {
                role: {
                    include: {
                        rolePolicies: {
                            include: {
                                policy: true
                            }
                        }
                    }
                }
            }
        })
        : [];

    // Map groupRoles back into a format compatible with existing extraction logic
    const enrichedUserGroups = userGroups.map((ug) => {
        const rolesForThisGroup = groupRoles
            .filter((gr) => gr.groupId === ug.groupId)
            .map((gr) => ({ role: gr.role }));

        return {
            ...ug,
            group: {
                ...ug.group,
                groupRoles: rolesForThisGroup
            }
        };
    });

    return [directUserRoles, enrichedUserGroups];
}

async function getCachedUserAccessContext(userId) {
    const versionKey = 'user:permissions:version';
    let version = '1';

    // 1. Get current version of permissions cache
    if (redis.status === 'ready') {
        try {
            version = (await redis.get(versionKey)) || '1';
        } catch (err) {
            logger.error('Redis error getting permissions version', { error: err.message });
        }
    }

    const cacheKey = `user:access_ctx:${userId}:${version}`;

    // 2. Try to get cached context
    if (redis.status === 'ready') {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err) {
            logger.error('Redis error reading user access context cache', { error: err.message });
        }
    }

    // 3. Cache miss: Fetch and calculate
    const [userRoles, enrichedUserGroups] = await fetchFullUserAccessContext(userId);
    const isSuperAdmin = isUserSuperAdmin(userRoles, enrichedUserGroups);
    const roleMap = extractUniqueRoles(userRoles, enrichedUserGroups);
    const policies = extractPolicies(roleMap);

    const directRoles = userRoles.map((ur) => ur.role);
    const groups = enrichedUserGroups.map((ug) => ({
        ...ug.group,
        roles: ug.group?.groupRoles?.map((gr) => gr.role) || [],
    }));

    const context = { isSuperAdmin, policies, directRoles, groups };

    // 4. Write back to Redis
    if (redis.status === 'ready') {
        try {
            await redis.setex(cacheKey, 300, JSON.stringify(context)); // 5 minutes TTL
        } catch (err) {
            logger.error('Redis error setting user access context cache', { error: err.message });
        }
    }

    return context;
}

/* -------------------------------------------------------------------------- */
/* Permissions Public API */
/* -------------------------------------------------------------------------- */

async function getUserPermissions(userId) {
    const context = await getCachedUserAccessContext(userId);
    return context.policies;
}

async function checkPermission(userId, action, resource) {
    const context = await getCachedUserAccessContext(userId);

    if (context.isSuperAdmin) {
        return { allowed: true, reason: 'SuperAdmin', matchedPolicies: [], deniedBy: null };
    }

    const { allowPolicies, denyPolicies } = splitPoliciesByEffect(context.policies);

    // Deny takes precedence
    const deniedBy = denyPolicies.find((p) => matchesPolicy(p, action, resource));
    if (deniedBy) {
        return { allowed: false, reason: `Explicitly denied by policy: ${deniedBy.name}`, matchedPolicies: [deniedBy], deniedBy };
    }

    const matchedAllowPolicies = allowPolicies.filter((p) => matchesPolicy(p, action, resource));
    if (matchedAllowPolicies.length > 0) {
        return { allowed: true, reason: 'Allowed by policy', matchedPolicies: matchedAllowPolicies, deniedBy: null };
    }

    return { allowed: false, reason: 'No matching policy', matchedPolicies: [], deniedBy: null };
}

async function getUserEffectivePermissions(userId) {
    const context = await getCachedUserAccessContext(userId);

    const allowed = new Set();
    const denied = new Set();

    context.policies.forEach((p) => {
        const target = p.effect === 'DENY' ? denied : allowed;
        p.actions.forEach((a) => target.add(a));
    });

    return {
        roles: context.directRoles,
        groups: context.groups,
        policies: context.policies,
        effectivePermissions: {
            allowed: Array.from(allowed),
            denied: Array.from(denied),
        },
    };
}

async function invalidatePermissionsCache() {
    if (redis.status === 'ready') {
        try {
            await redis.incr('user:permissions:version');
            logger.info('Permissions cache version bumped. All cached permissions invalidated.');
        } catch (err) {
            logger.error('Redis error bumping permissions version', { error: err.message });
        }
    }
}

module.exports = {
    getUserPermissions,
    checkPermission,
    getUserEffectivePermissions,
    invalidatePermissionsCache,
};
