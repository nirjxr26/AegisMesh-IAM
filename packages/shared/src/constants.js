export const API_PATHS = {
    AUTH: '/api/auth',
    USERS: '/api/users',
    ROLES: '/api/roles',
    GROUPS: '/api/groups',
    POLICIES: '/api/policies',
    AUDIT_LOGS: '/api/audit-logs',
    SETTINGS: '/api/settings',
    ANALYTICS: '/api/analytics',
    NOTIFICATIONS: '/api/notifications',
    MFA: '/api/auth/mfa',
};

export const USER_STATUS = {
    ACTIVE: 'ACTIVE',
    LOCKED: 'LOCKED',
    INACTIVE: 'INACTIVE',
    PENDING: 'PENDING',
};

export const PERMISSION_EFFECT = {
    ALLOW: 'ALLOW',
    DENY: 'DENY',
};

export const AUDIT_ACTIONS = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    LOGIN_FAILED: 'login_failed',
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    EXPORT: 'export',
    MFA_ENABLE: 'mfa_enable',
    MFA_DISABLE: 'mfa_disable',
    PASSWORD_CHANGE: 'password_change',
    PASSWORD_RESET: 'password_reset',
    ROLE_ASSIGN: 'role_assign',
    ROLE_REVOKE: 'role_revoke',
    SESSION_REVOKE: 'session_revoke',
    API_KEY_CREATE: 'api_key_create',
    API_KEY_REVOKE: 'api_key_revoke',
};

export const MFA_METHODS = {
    TOTP: 'TOTP',
    SMS: 'SMS',
    EMAIL: 'EMAIL',
};

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
