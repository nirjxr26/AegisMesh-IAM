const prisma = require('../../config/database');

function asObject(value) {
    return value &&
        typeof value === 'object' &&
        !Array.isArray(value)
        ? value
        : {};
}

function formatActorName(actor) {
    const firstName = String(actor?.firstName || '').trim();
    const lastName = String(actor?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || actor?.email || 'An administrator';
}

async function resolveRoleName(roleId) {
    if (!roleId) {
        return null;
    }

    const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { name: true },
    });

    return role?.name || null;
}

async function resolvePolicyName(policyId) {
    if (!policyId) {
        return null;
    }

    const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        select: { name: true },
    });

    return policy?.name || null;
}

function buildRoleAssignedMessage(roleName, actorName) {
    if (!roleName) {
        return `${actorName} assigned a new role to your account.`;
    }

    return `${actorName} assigned you the ${roleName} role.`;
}

async function buildRoleAssignedNotification(entry) {
    const metadata = asObject(entry.metadata);

    const targetUserId =
        metadata.assignedTo ||
        entry.resourceId ||
        null;

    if (!targetUserId) {
        return null;
    }

    const roleName = await resolveRoleName(
        metadata.roleId
    );

    const actorName = formatActorName(entry.user);

    return {
        targetUserId,
        preferenceKey: 'roleAssignedInApp',
        type: 'role',
        severity: 'info',
        title: 'Role assigned',
        message: buildRoleAssignedMessage(
            roleName,
            actorName
        ),
        link: '/dashboard',
        metadata: {
            roleId: metadata.roleId || null,
            roleName,
        },
    };
}

const POLICY_ACTION_VERBS = {
    POLICY_CREATED: 'created',
    POLICY_UPDATED: 'updated',
    POLICY_DELETED: 'deleted',
    POLICY_ATTACHED: 'attached to a role',
    POLICY_DETACHED: 'detached from a role',
};

function buildPolicyMessage(policyName, verb) {
    if (!policyName) {
        return `A policy was ${verb}.`;
    }

    return `Policy ${policyName} was ${verb}.`;
}

async function buildPolicyChangedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);

    const policyId =
        metadata.policyId ||
        entry.resourceId ||
        null;

    const policyName =
        metadata.policyName ||
        await resolvePolicyName(policyId);

    const verb =
        POLICY_ACTION_VERBS[entry.action] ||
        'updated';

    return {
        targetUserId: entry.userId,
        preferenceKey: 'policyChangedInApp',
        type: 'system',
        severity: 'info',
        title: 'Policy updated',
        message: buildPolicyMessage(
            policyName,
            verb
        ),
        link: '/dashboard/policies',
        metadata: {
            policyId,
            policyName,
        },
    };
}

module.exports = {
    buildRoleAssignedNotification,
    buildPolicyChangedNotification,
};
