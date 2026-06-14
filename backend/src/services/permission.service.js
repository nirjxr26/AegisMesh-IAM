const prisma = require('../config/database');

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
    // 1. Fetch direct roles and their policies
    const directUserRoles = await prisma.userRole.findMany({
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
    });

    // 2. Fetch user's groups
    const userGroups = await prisma.userGroup.findMany({
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
    });

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

/* -------------------------------------------------------------------------- */
/* Permissions Public API */
/* -------------------------------------------------------------------------- */

async function getUserPermissions(userId) {
    const [userRoles, userGroups] = await fetchFullUserAccessContext(userId);
    const roleMap = extractUniqueRoles(userRoles, userGroups);
    return extractPolicies(roleMap);
}

async function checkPermission(userId, action, resource) {
    const [userRoles, userGroups] = await fetchFullUserAccessContext(userId);

    if (isUserSuperAdmin(userRoles, userGroups)) {
        return { allowed: true, reason: 'SuperAdmin', matchedPolicies: [], deniedBy: null };
    }

    const roleMap = extractUniqueRoles(userRoles, userGroups);
    const policies = extractPolicies(roleMap);
    const { allowPolicies, denyPolicies } = splitPoliciesByEffect(policies);

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
    const [userRoles, userGroups] = await fetchFullUserAccessContext(userId);
    const roleMap = extractUniqueRoles(userRoles, userGroups);
    const policies = extractPolicies(roleMap);

    const directRoles = userRoles.map((ur) => ur.role);
    const groups = userGroups.map((ug) => ({
        ...ug.group,
        roles: ug.group?.groupRoles?.map((gr) => gr.role) || [],
    }));

    const allowed = new Set();
    const denied = new Set();

    policies.forEach((p) => {
        const target = p.effect === 'DENY' ? denied : allowed;
        p.actions.forEach((a) => target.add(a));
    });

    return {
        roles: directRoles,
        groups,
        policies,
        effectivePermissions: {
            allowed: Array.from(allowed),
            denied: Array.from(denied),
        },
    };
}

module.exports = {
    getUserPermissions,
    checkPermission,
    getUserEffectivePermissions,
};
