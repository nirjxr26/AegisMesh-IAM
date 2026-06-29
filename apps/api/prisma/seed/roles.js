const {
    uuidv4,
    daysAgo,
    hoursAgo,
    toIso,
    roleSeeds,
    roleIdByName,
    toPrismaPolicyEffect,
} = require('./data');
const { users } = require('./users');

const policies = [
    {
        id: uuidv4(),
        name: 'AdministratorAccess',
        description: 'Full administrative control across IAM services and resources',
        effect: 'Allow',
        actions: ['*:*'],
        resources: ['*'],
        type: 'aws_managed',
        attachedToRoles: [roleIdByName.SuperAdmin],
        createdAt: toIso(daysAgo(330)),
        updatedAt: toIso(daysAgo(7)),
    },
    {
        id: uuidv4(),
        name: 'ReadOnlyAccess',
        description: 'Read-only visibility into IAM resources and configurations',
        effect: 'Allow',
        actions: ['*:Describe*', '*:List*', '*:Get*'],
        resources: ['*'],
        type: 'aws_managed',
        attachedToRoles: [roleIdByName.ReadOnlyAccess, roleIdByName.SecurityAuditor, roleIdByName.BillingViewer],
        createdAt: toIso(daysAgo(325)),
        updatedAt: toIso(daysAgo(6)),
    },
    {
        id: uuidv4(),
        name: 'IAMFullAccess',
        description: 'Complete IAM administration actions',
        effect: 'Allow',
        actions: ['iam:*'],
        resources: ['arn:aws:iam::*:*'],
        type: 'aws_managed',
        attachedToRoles: [roleIdByName.SuperAdmin, roleIdByName.IAMUserAdmin],
        createdAt: toIso(daysAgo(312)),
        updatedAt: toIso(daysAgo(5)),
    },
    {
        id: uuidv4(),
        name: 'IAMReadOnlyAccess',
        description: 'Read-only IAM API access',
        effect: 'Allow',
        actions: ['iam:Get*', 'iam:List*'],
        resources: ['arn:aws:iam::*:*'],
        type: 'aws_managed',
        attachedToRoles: [roleIdByName.ReadOnlyAccess, roleIdByName.SecurityAuditor],
        createdAt: toIso(daysAgo(305)),
        updatedAt: toIso(daysAgo(5)),
    },
    {
        id: uuidv4(),
        name: 'UserManagement',
        description: 'Create, update and remove IAM users',
        effect: 'Allow',
        actions: ['iam:CreateUser', 'iam:DeleteUser', 'iam:UpdateUser', 'iam:ListUsers'],
        resources: ['arn:aws:iam::*:user/*'],
        type: 'aws_managed',
        attachedToRoles: [roleIdByName.IAMUserAdmin, roleIdByName.SuperAdmin],
        createdAt: toIso(daysAgo(287)),
        updatedAt: toIso(daysAgo(4)),
    },
    {
        id: uuidv4(),
        name: 'RoleManagement',
        description: 'Create and manage IAM roles and role relationships',
        effect: 'Allow',
        actions: ['iam:CreateRole', 'iam:DeleteRole', 'iam:AttachRolePolicy', 'iam:ListRoles'],
        resources: ['arn:aws:iam::*:role/*'],
        type: 'aws_managed',
        attachedToRoles: [roleIdByName.IAMUserAdmin, roleIdByName.SuperAdmin],
        createdAt: toIso(daysAgo(275)),
        updatedAt: toIso(daysAgo(4)),
    },
    {
        id: uuidv4(),
        name: 'PolicyManagement',
        description: 'Create, update and attach custom IAM policies',
        effect: 'Allow',
        actions: ['iam:CreatePolicy', 'iam:DeletePolicy', 'iam:AttachUserPolicy', 'iam:ListPolicies'],
        resources: ['arn:aws:iam::*:policy/*'],
        type: 'custom',
        attachedToRoles: [roleIdByName.PolicyManager, roleIdByName.SuperAdmin],
        createdAt: toIso(daysAgo(240)),
        updatedAt: toIso(daysAgo(3)),
    },
    {
        id: uuidv4(),
        name: 'GroupManagement',
        description: 'Create and maintain IAM groups and memberships',
        effect: 'Allow',
        actions: ['iam:CreateGroup', 'iam:DeleteGroup', 'iam:AddUserToGroup', 'iam:ListGroups'],
        resources: ['arn:aws:iam::*:group/*'],
        type: 'custom',
        attachedToRoles: [roleIdByName.GroupManager, roleIdByName.IAMUserAdmin],
        createdAt: toIso(daysAgo(225)),
        updatedAt: toIso(daysAgo(3)),
    },
    {
        id: uuidv4(),
        name: 'AuditLogAccess',
        description: 'Read security and activity logs',
        effect: 'Allow',
        actions: ['logs:GetLogEvents', 'logs:FilterLogEvents', 'logs:DescribeLogGroups'],
        resources: ['arn:aws:logs:*:*:log-group:*'],
        type: 'custom',
        attachedToRoles: [roleIdByName.SecurityAuditor, roleIdByName.SuperAdmin],
        createdAt: toIso(daysAgo(210)),
        updatedAt: toIso(daysAgo(2)),
    },
    {
        id: uuidv4(),
        name: 'SessionManagement',
        description: 'Create, view and revoke active sessions',
        effect: 'Allow',
        actions: ['iam:CreateSession', 'iam:DeleteSession', 'iam:ListSessions'],
        resources: ['arn:aws:iam::*:session/*'],
        type: 'custom',
        attachedToRoles: [roleIdByName.DevOpsEngineer, roleIdByName.SuperAdmin],
        createdAt: toIso(daysAgo(195)),
        updatedAt: toIso(daysAgo(2)),
    },
    {
        id: uuidv4(),
        name: 'DenyRootAccess',
        description: 'Blocks any root-account level IAM operation',
        effect: 'Deny',
        actions: ['iam:*Root*'],
        resources: ['*'],
        type: 'custom',
        attachedToRoles: [roleIdByName.SuperAdmin, roleIdByName.IAMUserAdmin, roleIdByName.DevOpsEngineer],
        createdAt: toIso(daysAgo(182)),
        updatedAt: toIso(daysAgo(2)),
    },
    {
        id: uuidv4(),
        name: 'DenyPolicyDeletion',
        description: 'Prevents destructive policy detach/delete actions',
        effect: 'Deny',
        actions: ['iam:DeletePolicy', 'iam:DetachRolePolicy'],
        resources: ['arn:aws:iam::*:policy/*'],
        type: 'custom',
        attachedToRoles: [roleIdByName.SecurityAuditor, roleIdByName.GroupManager, roleIdByName.BillingViewer],
        createdAt: toIso(daysAgo(171)),
        updatedAt: toIso(daysAgo(1)),
    },
];

const groups = [
    {
        id: uuidv4(),
        name: 'Engineering',
        description: 'Core engineering team with dev access',
        memberIds: [users[4].id, users[5].id, users[6].id, users[7].id, users[18].id, users[19].id, users[20].id, users[21].id],
        attachedRoleIds: [roleIdByName.DevOpsEngineer],
        createdAt: toIso(daysAgo(250)),
        updatedAt: toIso(daysAgo(4)),
    },
    {
        id: uuidv4(),
        name: 'Security Team',
        description: 'Internal security and compliance',
        memberIds: [users[0].id, users[1].id, users[8].id, users[9].id],
        attachedRoleIds: [roleIdByName.SecurityAuditor, roleIdByName.ReadOnlyAccess],
        createdAt: toIso(daysAgo(235)),
        updatedAt: toIso(daysAgo(3)),
    },
    {
        id: uuidv4(),
        name: 'Platform Admins',
        description: 'Full platform administrators',
        memberIds: [users[2].id, users[3].id, users[10].id],
        attachedRoleIds: [roleIdByName.SuperAdmin],
        createdAt: toIso(daysAgo(220)),
        updatedAt: toIso(daysAgo(3)),
    },
    {
        id: uuidv4(),
        name: 'Product Team',
        description: 'Product managers with read access',
        memberIds: [users[11].id, users[12].id, users[13].id, users[14].id, users[15].id],
        attachedRoleIds: [roleIdByName.ReadOnlyAccess],
        createdAt: toIso(daysAgo(205)),
        updatedAt: toIso(daysAgo(2)),
    },
    {
        id: uuidv4(),
        name: 'Policy Reviewers',
        description: 'Responsible for policy lifecycle',
        memberIds: [users[16].id, users[17].id, users[22].id],
        attachedRoleIds: [roleIdByName.PolicyManager],
        createdAt: toIso(daysAgo(190)),
        updatedAt: toIso(daysAgo(2)),
    },
    {
        id: uuidv4(),
        name: 'Billing',
        description: 'Finance team with billing visibility',
        memberIds: [users[23].id, users[24].id],
        attachedRoleIds: [roleIdByName.BillingViewer],
        createdAt: toIso(daysAgo(175)),
        updatedAt: toIso(daysAgo(1)),
    },
];

const rolePolicyRows = policies.flatMap((policy) =>
    policy.attachedToRoles.map((roleId) => ({
        id: uuidv4(),
        roleId,
        policyId: policy.id,
    }))
);

const userRoleRows = users
    .filter((u) => u.roleId)
    .map((u, idx) => ({
        id: uuidv4(),
        userId: u.id,
        roleId: u.roleId,
        assignedAt: new Date(hoursAgo(240 - idx * 3)),
        assignedBy: users[0].id,
    }));

const userGroupRows = groups.flatMap((group) =>
    group.memberIds.map((userId, idx) => ({
        id: uuidv4(),
        userId,
        groupId: group.id,
        joinedAt: new Date(daysAgo(160 - idx * 2)),
    }))
);

const groupRoleRows = groups.flatMap((group) =>
    group.attachedRoleIds.map((roleId) => ({
        id: uuidv4(),
        groupId: group.id,
        roleId,
        assignedAt: new Date(daysAgo(120)),
    }))
);

async function seedRoles(prisma) {
    await prisma.role.createMany({
        data: roleSeeds.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.type === 'system',
            createdAt: new Date(role.createdAt),
            updatedAt: new Date(role.updatedAt),
        })),
    });

    await prisma.policy.createMany({
        data: policies.map((policy) => ({
            id: policy.id,
            name: policy.name,
            description: policy.description,
            effect: toPrismaPolicyEffect(policy.effect),
            actions: policy.actions,
            resources: policy.resources,
            conditions: {
                seededBy: 'production-seed',
                type: policy.type,
            },
            isSystem: policy.type === 'aws_managed',
            createdBy: users[0].id,
            createdAt: new Date(policy.createdAt),
            updatedAt: new Date(policy.updatedAt),
        })),
    });

    await prisma.group.createMany({
        data: groups.map((group) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            createdAt: new Date(group.createdAt),
            updatedAt: new Date(group.updatedAt),
        })),
    });

    await prisma.userRole.createMany({ data: userRoleRows });
    await prisma.rolePolicy.createMany({ data: rolePolicyRows });
    await prisma.userGroup.createMany({ data: userGroupRows });
    await prisma.groupRole.createMany({ data: groupRoleRows });
}

module.exports = {
    policies,
    groups,
    rolePolicyRows,
    userRoleRows,
    userGroupRows,
    groupRoleRows,
    seedRoles,
};
