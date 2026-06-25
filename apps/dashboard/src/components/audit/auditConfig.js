const CATEGORY_CONFIG = {
    AUTHENTICATION: { label: 'Authentication', color: '#3B82F6', icon: '🔐' },
    AUTHORIZATION: { label: 'Authorization', color: '#EF4444', icon: '🛡️' },
    USER_MANAGEMENT: { label: 'User Mgmt', color: '#8B5CF6', icon: '👤' },
    ROLE_MANAGEMENT: { label: 'Role Mgmt', color: '#F59E0B', icon: '🏷️' },
    POLICY_MANAGEMENT: { label: 'Policy Mgmt', color: '#10B981', icon: '📋' },
    GROUP_MANAGEMENT: { label: 'Group Mgmt', color: '#06B6D4', icon: '👥' },
    SESSION_MANAGEMENT: { label: 'Session Mgmt', color: '#EC4899', icon: '🔑' },
    MFA: { label: 'MFA', color: '#14B8A6', icon: '📱' },
    SECURITY: { label: 'Security', color: '#DC2626', icon: '🚨' },
    SYSTEM: { label: 'System', color: '#6B7280', icon: '⚙️' },
    DATA_ACCESS: { label: 'Data Access', color: '#7C3AED', icon: '📊' },
};

const RESULT_CONFIG = {
    SUCCESS: { label: 'Success', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
    FAILURE: { label: 'Failure', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
    ERROR: { label: 'Error', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
    BLOCKED: { label: 'Blocked', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
};

const SEVERITY_CONFIG = {
    CRITICAL: { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.15)', icon: '🔴' },
    HIGH: { color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)', icon: '🟠' },
    MEDIUM: { color: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)', icon: '🟡' },
    LOW: { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.15)', icon: '🟢' },
};

export { CATEGORY_CONFIG, RESULT_CONFIG, SEVERITY_CONFIG };
