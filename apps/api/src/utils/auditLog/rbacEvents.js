const { audit } = require('./_core');

const auditRole = {
    created: (req, roleId, roleName) => audit({
        req,
        action: 'ROLE_CREATED',
        category: 'ROLE_MANAGEMENT',
        resource: 'roles',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: { roleName },
    }),

    updated: (req, roleId, changes) => audit({
        req,
        action: 'ROLE_UPDATED',
        category: 'ROLE_MANAGEMENT',
        resource: 'roles',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: { changes },
    }),

    deleted: (req, roleId, roleName) => audit({
        req,
        action: 'ROLE_DELETED',
        category: 'ROLE_MANAGEMENT',
        resource: 'roles',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: { roleName },
    }),

    assigned: (req, roleId, targetUserId) => audit({
        req,
        action: 'ROLE_ASSIGNED',
        category: 'ROLE_MANAGEMENT',
        resource: 'users/roles',
        resourceId: targetUserId,
        result: 'SUCCESS',
        metadata: {
            roleId,
            assignedTo: targetUserId,
        },
    }),

    removed: (req, roleId, targetUserId) => audit({
        req,
        action: 'ROLE_REMOVED',
        category: 'ROLE_MANAGEMENT',
        resource: 'users/roles',
        resourceId: targetUserId,
        result: 'SUCCESS',
        metadata: {
            roleId,
            removedFrom: targetUserId,
        },
    }),
};

const auditPolicy = {
    created: (req, policyId, policyName) => audit({
        req,
        action: 'POLICY_CREATED',
        category: 'POLICY_MANAGEMENT',
        resource: 'policies',
        resourceId: policyId,
        result: 'SUCCESS',
        metadata: { policyName },
    }),

    updated: (req, policyId, changes) => audit({
        req,
        action: 'POLICY_UPDATED',
        category: 'POLICY_MANAGEMENT',
        resource: 'policies',
        resourceId: policyId,
        result: 'SUCCESS',
        metadata: { changes },
    }),

    deleted: (req, policyId, policyName) => audit({
        req,
        action: 'POLICY_DELETED',
        category: 'POLICY_MANAGEMENT',
        resource: 'policies',
        resourceId: policyId,
        result: 'SUCCESS',
        metadata: { policyName },
    }),

    attached: (req, policyId, roleId) => audit({
        req,
        action: 'POLICY_ATTACHED',
        category: 'POLICY_MANAGEMENT',
        resource: 'roles/policies',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: {
            policyId,
            attachedTo: roleId,
        },
    }),

    detached: (req, policyId, roleId) => audit({
        req,
        action: 'POLICY_DETACHED',
        category: 'POLICY_MANAGEMENT',
        resource: 'roles/policies',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: {
            policyId,
            detachedFrom: roleId,
        },
    }),

    simulated: (req, userId, action, resource, simResult) => audit({
        req,
        action: 'POLICY_SIMULATED',
        category: 'POLICY_MANAGEMENT',
        resource: 'policies/simulate',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: {
            targetUserId: userId,
            simulatedAction: action,
            simulatedResource: resource,
            simulationResult: simResult,
        },
    }),
};

const auditGroup = {
    created: (req, groupId, groupName) => audit({
        req,
        action: 'GROUP_CREATED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: { groupName },
    }),

    updated: (req, groupId, changes) => audit({
        req,
        action: 'GROUP_UPDATED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: { changes },
    }),

    deleted: (req, groupId, groupName) => audit({
        req,
        action: 'GROUP_DELETED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: { groupName },
    }),

    memberAdded: (req, groupId, memberId) => audit({
        req,
        action: 'GROUP_MEMBER_ADDED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups/members',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: {
            groupId,
            userId: memberId,
        },
    }),

    memberRemoved: (req, groupId, memberId) => audit({
        req,
        action: 'GROUP_MEMBER_REMOVED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups/members',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: {
            groupId,
            userId: memberId,
        },
    }),

    roleAttached: (req, groupId, roleId) => audit({
        req,
        action: 'GROUP_ROLE_ATTACHED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups/roles',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: {
            groupId,
            roleId,
        },
    }),

    roleDetached: (req, groupId, roleId) => audit({
        req,
        action: 'GROUP_ROLE_DETACHED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups/roles',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: {
            groupId,
            roleId,
        },
    }),
};

const auditPermission = {
    checked: (req, userId, action, resource, permissionResult) => {
        const resultDetails = typeof permissionResult === 'object' && permissionResult !== null
            ? permissionResult
            : { allowed: Boolean(permissionResult) };

        return audit({
            req,
            userId,
            action: 'PERMISSION_CHECKED',
            category: 'AUTHORIZATION',
            resource,
            result: resultDetails.allowed ? 'SUCCESS' : 'BLOCKED',
            metadata: {
                checkedAction: action,
                checkedResource: resource,
                allowed: Boolean(resultDetails.allowed),
                reason: resultDetails.reason || null,
                deniedBy: resultDetails.deniedBy?.name || null,
                matchedPolicies: Array.isArray(resultDetails.matchedPolicies)
                    ? resultDetails.matchedPolicies.map((policy) => policy.name || policy.id)
                    : [],
            },
        });
    },

    denied: (req, userId, action, resource, permissionResult = null) => audit({
        req,
        userId,
        action: 'PERMISSION_DENIED',
        category: 'AUTHORIZATION',
        resource,
        result: 'BLOCKED',
        errorCode: 'RBAC_001',
        metadata: {
            deniedAction: action,
            deniedResource: resource,
            reason: permissionResult?.reason || null,
            deniedBy: permissionResult?.deniedBy?.name || null,
        },
    }),
};

module.exports = {
    auditRole,
    auditPolicy,
    auditGroup,
    auditPermission,
};
