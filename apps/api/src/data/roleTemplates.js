const ALLOW = 'ALLOW';
const DENY = 'DENY';

const p = (name, description, effect, actions, resources) => ({ name, description, effect, actions, resources });
const policy = {
    denyAdmin: p('Deny-AdminOps', 'Block admin operations', DENY, ['roles:*', 'policies:*', 'users:delete', 'org:*'], ['*']),
    denyDestructive: p('Deny-Destructive', 'Block destructive actions', DENY, ['users:delete', 'roles:write', 'policies:write', 'org:*'], ['*']),
    denyAllWrite: p('Deny-AllWrite', 'Block all write operations', DENY, ['*:write', '*:delete', '*:create'], ['*']),
    denyWriteUsers: p('Deny-WriteUsers', 'Block all user write operations', DENY, ['users:write', 'users:delete', 'roles:*', 'policies:*'], ['*']),
    readUsers: p('Read-Users', 'Read access to all users', ALLOW, ['users:read'], ['users/*']),
    readRoles: p('Read-Roles', 'Read access to all roles', ALLOW, ['roles:read'], ['roles/*']),
    readPolicies: p('Read-Policies', 'Read access to all policies', ALLOW, ['policies:read'], ['policies/*']),
    readAudit: p('Read-Audit', 'Read access to audit logs', ALLOW, ['audit:read'], ['audit/*']),
    readAll: p('Read-All', 'Read everything in system', ALLOW, ['*:read'], ['*']),
};

const ROLE_TEMPLATES = [
    {
        id: 'read_only', name: 'Read Only',
        description: 'View all resources without making any changes',
        icon: 'eye', color: 'blue', category: 'basic',
        badge: 'Starter', badgeColor: 'blue',
        useCase: 'Perfect for auditors, stakeholders, or new team members who need visibility without write access',
        estimatedPolicies: 4,
        policies: [policy.readUsers, policy.readRoles, policy.readPolicies, policy.readAudit],
        permissions: [
            'View all users and their details', 'View roles and policies',
            'View audit logs and history', 'View groups and memberships',
        ],
        restrictions: [
            'Cannot create or modify anything', 'Cannot delete resources',
            'Cannot access security settings',
        ],
    },
    {
        id: 'developer', name: 'Developer',
        description: 'Full dev access with limited admin capabilities',
        icon: 'code-2', color: 'indigo', category: 'technical',
        badge: 'Popular', badgeColor: 'indigo',
        useCase: 'For engineering team members who need API key access and system visibility without admin risk',
        estimatedPolicies: 4,
        policies: [
            p('Dev-APIKeys', 'Manage own API keys', ALLOW, ['api-keys:read', 'api-keys:write'], ['api-keys/own/*']),
            p('Dev-ReadResources', 'Read all system resources', ALLOW, ['users:read', 'roles:read', 'groups:read'], ['*']),
            policy.readAudit,
            policy.denyDestructive,
        ],
        permissions: [
            'Create and manage own API keys', 'Read all users, roles, groups',
            'View audit logs and events', 'Access developer resources',
        ],
        restrictions: [
            'Cannot delete users', 'Cannot modify roles or policies',
            'Cannot access org settings',
        ],
    },
    {
        id: 'support_agent', name: 'Support Agent',
        description: 'Help users without destructive permissions',
        icon: 'headphones', color: 'green', category: 'operations',
        badge: null, badgeColor: null,
        useCase: 'For support teams who need to look up users, view account status, and assist with issues',
        estimatedPolicies: 3,
        policies: [
            policy.readUsers,
            p('Support-ManageStatus', 'Lock/unlock + verify emails', ALLOW, ['users:write'], ['users/*/status', 'users/*/verify-email']),
            policy.denyAdmin,
        ],
        permissions: [
            'View user details and history', 'Lock and unlock user accounts',
            'Verify user email addresses', 'View audit logs',
        ],
        restrictions: [
            'Cannot delete users', 'Cannot manage roles or policies',
            'Cannot change org settings',
        ],
    },
    {
        id: 'billing_admin', name: 'Billing Admin',
        description: 'Manage exports and org-level data without user write access',
        icon: 'credit-card', color: 'amber', category: 'operations',
        badge: null, badgeColor: null,
        useCase: 'For finance teams who manage reporting, exports, and need to view usage data',
        estimatedPolicies: 3,
        policies: [
            p('Billing-OrgRead', 'Read org settings', ALLOW, ['org:read'], ['org/*']),
            p('Billing-Export', 'Export audit and org data', ALLOW, ['audit:export', 'org:export'], ['audit/*', 'org/export']),
            policy.denyWriteUsers,
        ],
        permissions: [
            'View organization settings', 'Export audit data and reports',
            'View all users (read-only)', 'Access usage statistics',
        ],
        restrictions: [
            'Cannot modify users or roles', 'Cannot change security settings',
            'Cannot delete any resources',
        ],
    },
    {
        id: 'security_auditor', name: 'Security Auditor',
        description: 'Full read + export for compliance and security reviews',
        icon: 'shield-check', color: 'red', category: 'security',
        badge: 'Compliance', badgeColor: 'red',
        useCase: 'For compliance officers or security teams conducting audits, incident investigations, or compliance reviews',
        estimatedPolicies: 3,
        policies: [
            policy.readAll,
            p('Auditor-AuditExport', 'Export and stream audit logs', ALLOW, ['audit:export', 'audit:stream'], ['audit/*']),
            policy.denyAllWrite,
        ],
        permissions: [
            'Read-only access to everything', 'Export audit logs on demand',
            'Stream security events live', 'Full visibility for compliance',
        ],
        restrictions: [
            'Strictly read-only', 'Cannot modify anything at all',
        ],
    },
    {
        id: 'group_manager', name: 'Group Manager',
        description: 'Manage team groups and member assignments',
        icon: 'users', color: 'purple', category: 'operations',
        badge: null, badgeColor: null,
        useCase: 'For team leads or HR who need to manage team membership without broader admin access',
        estimatedPolicies: 3,
        policies: [
            p('GroupMgr-ManageGroups', 'Full CRUD on groups', ALLOW, ['groups:read', 'groups:write', 'groups:delete'], ['groups/*']),
            policy.readUsers,
            policy.denyAdmin,
        ],
        permissions: [
            'Create, edit, delete groups', 'Add and remove users from groups',
            'View all users to assign', 'View group role assignments',
        ],
        restrictions: [
            'Cannot manage roles or policies', 'Cannot delete users',
            'Cannot access security settings',
        ],
    },
];

module.exports = { ROLE_TEMPLATES };
