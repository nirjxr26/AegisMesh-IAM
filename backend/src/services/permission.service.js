const prisma = require('../config/database');

const REGEX_ESCAPE_PATTERN =
    /[.+?^${}()|[\]\\]/g;

const REGEX_ESCAPE_REPLACEMENT =
    String.raw`\$&`;

/* -------------------------------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------------------------------- */

function matchPattern(pattern, value) {
    if (pattern === '*') {
        return true;
    }

    const escapedPattern = pattern
        .replaceAll(
            REGEX_ESCAPE_PATTERN,
            REGEX_ESCAPE_REPLACEMENT
        )
        .replaceAll('*', '.*');

    const regex = new RegExp(
        `^${escapedPattern}$`
    );

    return regex.test(value);
}

function matchesPolicy(
    policy,
    action,
    resource
) {
    const actionMatch = policy.actions.some(
        (policyAction) =>
            matchPattern(policyAction, action)
    );

    const resourceMatch =
        policy.resources.some((policyResource) =>
            matchPattern(
                policyResource,
                resource
            )
        );

    return actionMatch && resourceMatch;
}

function splitPoliciesByEffect(policies) {
    return policies.reduce(
        (accumulator, policy) => {
            if (policy.effect === 'ALLOW') {
                accumulator.allowPolicies.push(
                    policy
                );
            }

            if (policy.effect === 'DENY') {
                accumulator.denyPolicies.push(
                    policy
                );
            }

            return accumulator;
        },
        {
            allowPolicies: [],
            denyPolicies: [],
        }
    );
}

function extractUniqueRoles(
    userRoles,
    userGroups
) {
    const roleMap = new Map();

    userRoles.forEach((userRole) => {
        const role = userRole.role;

        if (role) {
            roleMap.set(role.id, role);
        }
    });

    userGroups.forEach((userGroup) => {
        userGroup.group?.groupRoles?.forEach(
            (groupRole) => {
                const role = groupRole.role;

                if (role) {
                    roleMap.set(role.id, role);
                }
            }
        );
    });

    return roleMap;
}

function extractPolicies(roleMap) {
    const policyMap = new Map();

    roleMap.forEach((role) => {
        role.rolePolicies?.forEach(
            (rolePolicy) => {
                const policy = rolePolicy.policy;

                if (policy) {
                    policyMap.set(
                        policy.id,
                        policy
                    );
                }
            }
        );
    });

    return Array.from(policyMap.values());
}

function hasSuperAdminRole(
    userRoles,
    userGroups
) {
    const directSuperAdmin =
        userRoles.some(
            (userRole) =>
                userRole.role?.name ===
                'SuperAdmin'
        );

    if (directSuperAdmin) {
        return true;
    }

    return userGroups.some((userGroup) =>
        userGroup.group?.groupRoles?.some(
            (groupRole) =>
                groupRole.role?.name ===
                'SuperAdmin'
        )
    );
}

/* -------------------------------------------------------------------------- */
/* Permissions */
/* -------------------------------------------------------------------------- */

async function getUserPermissions(userId) {
    const userRoles =
        await prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        rolePolicies: {
                            include: {
                                policy: true,
                            },
                        },
                    },
                },
            },
        });

    const userGroups =
        await prisma.userGroup.findMany({
            where: { userId },
            include: {
                group: {
                    include: {
                        groupRoles: {
                            include: {
                                role: {
                                    include: {
                                        rolePolicies:
                                            {
                                                include:
                                                    {
                                                        policy: true,
                                                    },
                                            },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

    const roleMap = extractUniqueRoles(
        userRoles,
        userGroups
    );

    const policies = extractPolicies(roleMap);

    return policies.map((policy) => ({
        id: policy.id,
        name: policy.name,
        effect: policy.effect,
        actions: policy.actions,
        resources: policy.resources,
    }));
}

async function checkPermission(
    userId,
    action,
    resource
) {
    const userRoles =
        await prisma.userRole.findMany({
            where: { userId },
            include: {
                role: true,
            },
        });

    const userGroups =
        await prisma.userGroup.findMany({
            where: { userId },
            include: {
                group: {
                    include: {
                        groupRoles: {
                            include: {
                                role: true,
                            },
                        },
                    },
                },
            },
        });

    const isSuperAdmin =
        hasSuperAdminRole(
            userRoles,
            userGroups
        );

    if (isSuperAdmin) {
        return {
            allowed: true,
            reason: 'SuperAdmin',
            matchedPolicies: [],
            deniedBy: null,
        };
    }

    const policies =
        await getUserPermissions(userId);

    const {
        allowPolicies,
        denyPolicies,
    } = splitPoliciesByEffect(policies);

    for (const policy of denyPolicies) {
        if (
            matchesPolicy(
                policy,
                action,
                resource
            )
        ) {
            return {
                allowed: false,
                reason: `Explicitly denied by policy: ${policy.name}`,
                matchedPolicies: [policy],
                deniedBy: policy,
            };
        }
    }

    const matchedAllowPolicies =
        allowPolicies.filter((policy) =>
            matchesPolicy(
                policy,
                action,
                resource
            )
        );

    if (matchedAllowPolicies.length) {
        return {
            allowed: true,
            reason: 'Allowed by policy',
            matchedPolicies:
                matchedAllowPolicies,
            deniedBy: null,
        };
    }

    return {
        allowed: false,
        reason: 'No matching policy',
        matchedPolicies: [],
        deniedBy: null,
    };
}

async function getUserEffectivePermissions(
    userId
) {
    const userRoles =
        await prisma.userRole.findMany({
            where: { userId },
            include: {
                role: true,
            },
        });

    const userGroups =
        await prisma.userGroup.findMany({
            where: { userId },
            include: {
                group: {
                    include: {
                        groupRoles: {
                            include: {
                                role: true,
                            },
                        },
                    },
                },
            },
        });

    const directRoles = userRoles.map(
        (userRole) => userRole.role
    );

    const groups = userGroups.map(
        (userGroup) => ({
            ...userGroup.group,
            roles:
                userGroup.group?.groupRoles?.map(
                    (groupRole) =>
                        groupRole.role
                ) || [],
        })
    );

    const policies =
        await getUserPermissions(userId);

    const allowed = new Set();
    const denied = new Set();

    policies.forEach((policy) => {
        const targetSet =
            policy.effect === 'DENY'
                ? denied
                : allowed;

        policy.actions.forEach((action) =>
            targetSet.add(action)
        );
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