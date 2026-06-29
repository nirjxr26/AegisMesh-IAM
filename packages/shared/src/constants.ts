// NOSONAR — no hardcoded passwords; Sonar false positive on MFA/PAGINATION values
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
} as const;

export const USER_STATUS = {
    ACTIVE: 'ACTIVE',
    LOCKED: 'LOCKED',
    INACTIVE: 'INACTIVE',
    PENDING: 'PENDING',
} as const;

export const PERMISSION_EFFECT = {
    ALLOW: 'ALLOW',
    DENY: 'DENY',
} as const;

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
} as const;

export const MFA_METHODS = {
    TOTP: 'TOTP',
    SMS: 'SMS',
    EMAIL: 'EMAIL',
} as const;

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export type PermissionEffect = (typeof PERMISSION_EFFECT)[keyof typeof PERMISSION_EFFECT];
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
export type MfaMethod = (typeof MFA_METHODS)[keyof typeof MFA_METHODS];
