import axios from 'axios';

const AUTH_EXPIRED_EVENT = 'iam:auth-expired';
const REAUTH_HEADER = 'x-reauth-token';
const REAUTH_TOKEN_STORAGE_KEY = 'iam:reauth-token';
const PUBLIC_AUTH_PATHS = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/logout',
];

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

const getStoredReauthToken = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.sessionStorage.getItem(REAUTH_TOKEN_STORAGE_KEY);
};

const storeReauthToken = (token) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (token) {
        window.sessionStorage.setItem(REAUTH_TOKEN_STORAGE_KEY, token);
    }
};

const clearStoredReauthToken = () => {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.removeItem(REAUTH_TOKEN_STORAGE_KEY);
};

const clearStoredAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearStoredReauthToken();
    delete api.defaults.headers.common.Authorization;
};

const notifyAuthExpired = () => {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
};

const redirectToLoginIfNeeded = () => {
    if (typeof window === 'undefined') {
        return;
    }

    const currentPath = window.location.pathname || '';
    if (currentPath === '/login') {
        return;
    }

    window.location.href = '/login';
};

const isRefreshRequest = (url = '') => url.includes('/auth/refresh-token');
const isPublicAuthRequest = (url = '') => PUBLIC_AUTH_PATHS.some((path) => url.includes(path));

// Request interceptor to attach access token
api.interceptors.request.use(
    (config) => {
        if (config.skipAuth) {
            return config;
        }

        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else if (config.headers?.Authorization) {
            delete config.headers.Authorization;
        }

        const reauthToken = getStoredReauthToken();
        if (reauthToken && !isPublicAuthRequest(config.url || '')) {
            config.headers[REAUTH_HEADER] = reauthToken;
        } else if (config.headers?.[REAUTH_HEADER]) {
            delete config.headers[REAUTH_HEADER];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        const reauthToken = response.headers?.[REAUTH_HEADER];
        if (reauthToken) {
            storeReauthToken(reauthToken);
        }

        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || '';
        const hasRefreshToken = Boolean(localStorage.getItem('refreshToken'));
        const responseCode = error.response?.data?.code || error.response?.data?.error?.code;

        if (responseCode === 'REAUTH_REQUIRED') {
            clearStoredReauthToken();
            return Promise.reject(error);
        }

        if (
            error.response?.status === 401
            && originalRequest
            && !originalRequest._retry
            && !originalRequest.skipAuth
            && hasRefreshToken
            && !isRefreshRequest(requestUrl)
            && !isPublicAuthRequest(requestUrl)
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (token) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    clearStoredAuth();
                    notifyAuthExpired();
                    redirectToLoginIfNeeded();
                    return Promise.reject(error);
                }

                const { data } = await axios.post('/api/auth/refresh-token', { refreshToken }, {
                    withCredentials: true,
                    skipAuth: true,
                });

                const { accessToken, refreshToken: newRefreshToken } = data.data;
                localStorage.setItem('accessToken', accessToken);
                if (newRefreshToken) {
                    localStorage.setItem('refreshToken', newRefreshToken);
                }

                api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
                processQueue(null, accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearStoredAuth();
                notifyAuthExpired();
                redirectToLoginIfNeeded();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Auth API functions
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => {
        const refreshToken = localStorage.getItem('refreshToken');
        return api.post('/auth/logout', refreshToken ? { refreshToken } : {});
    },
    refreshToken: () => {
        const refreshToken = localStorage.getItem('refreshToken');
        return api.post('/auth/refresh-token', refreshToken ? { refreshToken } : {});
    },
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    verifyEmail: (token) => api.post('/auth/verify-email', { token }),
    getProfile: () => api.get('/auth/me'),
    getSessions: () => api.get('/auth/sessions'),
    revokeSession: (sessionId) => api.delete(`/auth/sessions/${sessionId}`),

    // MFA
    setupMFA: () => api.post('/auth/mfa/setup'),
    verifyMFASetup: (totpCode) => api.post('/auth/mfa/verify-setup', { totpCode }),
    disableMFA: (data) => api.post('/auth/mfa/disable', data),
};

// RBAC API functions
export const rbacAPI = {
    // Roles
    getRoles: (params) => api.get('/roles', { params }),
    getRole: (id) => api.get(`/roles/${id}`),
    createRole: (data) => api.post('/roles', data),
    updateRole: (id, data) => api.put(`/roles/${id}`, data),
    deleteRole: (id) => api.delete(`/roles/${id}`),
    attachPolicyToRole: (roleId, policyId) => api.post(`/roles/${roleId}/policies`, { policyId }),
    detachPolicyFromRole: (roleId, policyId) => api.delete(`/roles/${roleId}/policies/${policyId}`),
    getRoleUsers: (id) => api.get(`/roles/${id}/users`),

    // Policies
    getPolicies: (params) => api.get('/policies', { params }),
    getPolicy: (id) => api.get(`/policies/${id}`),
    createPolicy: (data) => api.post('/policies', data),
    updatePolicy: (id, data) => api.put(`/policies/${id}`, data),
    deletePolicy: (id) => api.delete(`/policies/${id}`),
    simulatePolicy: (data) => api.post('/policies/simulate', data),

    // Groups
    getGroups: () => api.get('/groups'),
    getGroup: (id) => api.get(`/groups/${id}`),
    createGroup: (data) => api.post('/groups', data),
    updateGroup: (id, data) => api.put(`/groups/${id}`, data),
    deleteGroup: (id) => api.delete(`/groups/${id}`),
    addGroupMember: (groupId, userId) => api.post(`/groups/${groupId}/members`, { userId }),
    removeGroupMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
    attachRoleToGroup: (groupId, roleId) => api.post(`/groups/${groupId}/roles`, { roleId }),
    detachRoleFromGroup: (groupId, roleId) => api.delete(`/groups/${groupId}/roles/${roleId}`),

    // User Permissions
    getUserRoles: (userId) => api.get(`/users/${userId}/roles`),
    assignUserRole: (userId, roleId) => api.post(`/users/${userId}/roles`, { roleId }),
    removeUserRole: (userId, roleId) => api.delete(`/users/${userId}/roles/${roleId}`),
    getUserPermissions: (userId) => api.get(`/users/${userId}/permissions`),
    getUserGroups: (userId) => api.get(`/users/${userId}/groups`),
};

// Audit API functions
export const auditAPI = {
    getLogs: (params) => api.get('/audit-logs', { params }),
    getLog: (id) => api.get(`/audit-logs/${id}`),
    getUserLogs: (userId, params) => api.get(`/audit-logs/user/${userId}`, { params }),
    getStats: () => api.get('/audit-logs/stats'),
    getSecurityAlerts: () => api.get('/audit-logs/security-alerts'),
    exportCSV: (filters) => api.post('/audit-logs/export', filters, { responseType: 'blob' }),
    cleanup: (data) => api.delete('/audit-logs/cleanup', { data }),
};

export const notificationsAPI = {
    getAll: (params) => api.get('/notifications', { params }),
    markRead: (id, read = true) => api.patch(`/notifications/${id}/read`, { read }),
    markAllRead: () => api.post('/notifications/mark-all-read'),
    delete: (id) => api.delete(`/notifications/${id}`),
};

export const bulkUsers = {
    updateStatus: (data) => api.post('/users/bulk/status', data),
    assignRoles: (data) => api.post('/users/bulk/roles', data),
    assignGroups: (data) => api.post('/users/bulk/groups', data),
    delete: (data) => api.post('/users/bulk/delete', data),
    export: (data) => api.post('/users/bulk/export', data, {
        responseType: 'text',
    }),
};

export const roleTemplates = {
    getAll: () => api.get('/roles/templates'),
    apply: (templateId, data) => api.post(`/roles/templates/${templateId}/apply`, data),
};

// User API functions
export const userAPI = {
    getUsers: (params) => api.get('/users', { params }),
    getUser: (id) => api.get(`/users/${id}`),
    createUser: (data) => api.post('/users', data),
    updateUser: (id, data) => api.put(`/users/${id}`, data),
    updateStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
    verifyEmail: (id) => api.put(`/users/${id}/verify-email`),
    deleteUser: (id, credentials = {}) => api.delete(`/users/${id}`, { data: credentials }),
    getUserSessions: (id) => api.get(`/users/${id}/sessions`),
    revokeSession: (id, sessionId) => api.delete(`/users/${id}/sessions/${sessionId}`),
    revokeAllSessions: (id) => api.delete(`/users/${id}/sessions`),
};

export const connectedAppsAPI = {
    getAll: () => api.get('/settings/connected-apps'),
    revoke: (appId) => api.delete(`/settings/connected-apps/${appId}`),
};

export const settingsAPI = {
    ensureDefaults: () => api.get('/settings/profile'),

    // Profile
    getProfile: () => api.get('/settings/profile'),
    updateProfile: (data) => api.patch('/settings/profile', data),
    uploadAvatar: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return api.post('/settings/profile/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    deleteAvatar: () => api.delete('/settings/profile/avatar'),

    // Security
    changePassword: (data) => api.post('/settings/security/change-password', data),
    getMfaSetup: () => api.get('/settings/security/mfa/setup'),
    verifyMfa: (data) => api.post('/settings/security/mfa/verify', data),
    disableMfa: (credentials = {}) => api.delete('/settings/security/mfa', { data: credentials }),
    regenerateBackupCodes: (credentials = {}) => api.post('/settings/security/mfa/backup-codes/regenerate', credentials),
    getLoginHistory: () => api.get('/settings/security/login-history'),
    getTrustedDevices: () => api.get('/settings/security/trusted-devices'),
    revokeTrustedDevice: (deviceId) => api.delete(`/settings/security/trusted-devices/${deviceId}`),
    revokeAllTrustedDevices: () => api.delete('/settings/security/trusted-devices'),

    // Sessions
    getSessions: () => api.get('/settings/sessions'),
    revokeSession: (sessionId) => api.delete(`/settings/sessions/${sessionId}`),
    revokeAllOtherSessions: (credentials = {}) => api.delete('/settings/sessions', { data: credentials }),

    // Notifications
    getNotifications: () => api.get('/settings/notifications'),
    updateNotifications: (data) => api.patch('/settings/notifications', data),

    // Organization
    getOrganization: () => api.get('/settings/organization'),
    updateOrganization: (data) => api.patch('/settings/organization', data),
    exportOrganizationData: (credentials = {}) => api.post('/settings/organization/export', credentials, { responseType: 'blob' }),
    resetOrganizationPolicies: (credentials = {}) => api.post('/settings/organization/reset-policies', credentials),

    // API Keys
    getApiKeys: () => api.get('/settings/api-keys'),
    createApiKey: (data, credentials = {}) => api.post('/settings/api-keys', { ...data, ...credentials }),
    revokeApiKey: (tokenId) => api.delete(`/settings/api-keys/${tokenId}`),
};

export default api;
