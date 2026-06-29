const {
    audit,
    createAuditLog,
    sseClients,
    addSSEClient,
    removeSSEClient,
} = require('./_core');

const { auditAuth, auditSecurity, auditMFA, auditSession } = require('./authEvents');
const { auditRole, auditPolicy, auditGroup, auditPermission } = require('./rbacEvents');
const { auditUser } = require('./settingsEvents');

module.exports = {
    audit,
    createAuditLog,
    auditAuth,
    auditSecurity,
    auditMFA,
    auditSession,
    auditRole,
    auditPolicy,
    auditGroup,
    auditPermission,
    auditUser,
    sseClients,
    addSSEClient,
    removeSSEClient,
};
