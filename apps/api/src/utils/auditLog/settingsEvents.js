const { audit } = require('./_core');

const auditUser = {
    created: (req, userId, email) => audit({
        req,
        action: 'USER_CREATED',
        category: 'USER_MANAGEMENT',
        resource: 'users',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { email, createdBy: req.user?.id }
    }),

    statusChanged: (req, userId, email, from, to) => audit({
        req,
        action: 'USER_STATUS_CHANGED',
        category: 'USER_MANAGEMENT',
        resource: 'users/status',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { targetEmail: email, previousStatus: from, newStatus: to }
    }),

    emailVerified: (req, userId, email) => audit({
        req,
        action: 'EMAIL_MANUALLY_VERIFIED',
        category: 'USER_MANAGEMENT',
        resource: 'users/verify-email',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { targetEmail: email, verifiedBy: req.user?.id }
    }),

    deleted: (req, userId, email) => audit({
        req,
        action: 'USER_DELETED',
        category: 'USER_MANAGEMENT',
        resource: 'users',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { deletedEmail: email, deletedBy: req.user?.id }
    }),

    sessionsRevoked: (req, userId, email, count) => audit({
        req,
        action: 'ALL_SESSIONS_REVOKED',
        category: 'SESSION_MANAGEMENT',
        resource: 'users/sessions',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { targetEmail: email, sessionsRevoked: count, revokedBy: req.user?.id }
    }),
};

module.exports = {
    auditUser,
};
