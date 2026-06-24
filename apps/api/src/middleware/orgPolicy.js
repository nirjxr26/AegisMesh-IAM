const {
    getOrganizationSettings,
    matchesAllowlist,
    normalizeIp,
} = require('../services/organizationSettings.service');

async function enforceOrgPolicyForRequest(req, user) {
    const settings = await getOrganizationSettings();

    if (Array.isArray(settings.ipAllowlist) && settings.ipAllowlist.length > 0) {
        const requestIp = normalizeIp(req.ip || req.socket?.remoteAddress || '');
        if (!matchesAllowlist(requestIp, settings.ipAllowlist)) {
            const error = new Error('IP address is not allowed by organization policy');
            error.statusCode = 403;
            error.errorCode = 'IP_NOT_ALLOWED';
            throw error;
        }
    }

    if (settings.requireMfaForAll && !user?.mfaEnabled) {
        const error = new Error('MFA is required by organization policy');
        error.statusCode = 403;
        error.errorCode = 'MFA_REQUIRED';
        throw error;
    }

    return settings;
}

module.exports = {
    enforceOrgPolicyForRequest,
};
