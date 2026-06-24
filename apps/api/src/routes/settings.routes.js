const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/authenticate');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const { requireReauth, SENSITIVE_ACTIONS } = require('../middleware/requireReauth');
const { validate } = require('../middleware/validate');
const schemas = require('../config/validationSchemas');
const settingsController = require('../controllers/settings.controller');

const router = express.Router();

const requirePrivilegedApiKeyReauth = (req, res, next) => {
    const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes : [];
    const hasPrivilegedScopes = scopes.some((scope) => {
        const normalized = String(scope || '');
        return normalized.startsWith('write:') || normalized.startsWith('delete:');
    });

    if (!hasPrivilegedScopes) {
        return next();
    }

    return requireReauth(SENSITIVE_ACTIONS.CREATE_PRIV_TOKEN)(req, res, next);
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Only JPG, PNG, and WebP files are allowed'));
        }
        return cb(null, true);
    },
});

router.use(authenticate);
router.use(settingsController.ensureDefaults);

// Profile
router.get('/profile', settingsController.getProfile);
router.patch('/profile', validate(schemas.settingsProfileUpdate), settingsController.updateProfile);
router.post('/profile/avatar', upload.single('avatar'), settingsController.uploadAvatar);
router.delete('/profile/avatar', settingsController.deleteAvatar);

// Security
router.post('/security/change-password', requireReauth(SENSITIVE_ACTIONS.CHANGE_PASSWORD), validate(schemas.settingsChangePassword), settingsController.changePassword);
router.get('/security/mfa/setup', settingsController.getMfaSetup);
router.post('/security/mfa/verify', validate(schemas.settingsMfaVerify), settingsController.verifyMfa);
router.delete('/security/mfa', requireReauth(SENSITIVE_ACTIONS.DISABLE_MFA), settingsController.disableMfa);
router.post('/security/mfa/backup-codes/regenerate', requireReauth(SENSITIVE_ACTIONS.VIEW_BACKUP_CODES), settingsController.regenerateBackupCodes);
router.get('/security/login-history', settingsController.getLoginHistory);
router.get('/security/trusted-devices', settingsController.getTrustedDevices);
router.delete('/security/trusted-devices/:deviceId', settingsController.revokeTrustedDevice);
router.delete('/security/trusted-devices', settingsController.revokeAllTrustedDevices);
router.get('/connected-apps', settingsController.getConnectedApps);
router.delete('/connected-apps/:appId', settingsController.revokeConnectedApp);

// Sessions
router.get('/sessions', settingsController.getSessions);
router.delete('/sessions/:sessionId', settingsController.revokeSession);
router.delete('/sessions', requireReauth(SENSITIVE_ACTIONS.REVOKE_ALL_SESSIONS), settingsController.revokeAllOtherSessions);

// Notifications
router.get('/notifications', settingsController.getNotifications);
router.patch('/notifications', validate(schemas.settingsNotificationsUpdate), settingsController.updateNotifications);

// Organization (SuperAdmin)
router.get('/organization', requireSuperAdmin, settingsController.getOrganization);
router.patch('/organization', requireSuperAdmin, validate(schemas.settingsOrganizationUpdate), settingsController.updateOrganization);
router.post('/organization/export', requireSuperAdmin, requireReauth(SENSITIVE_ACTIONS.EXPORT_DATA), settingsController.exportOrganizationData);
router.post('/organization/reset-policies', requireSuperAdmin, requireReauth(SENSITIVE_ACTIONS.RESET_POLICIES), settingsController.resetOrganizationPolicies);

// API Keys
router.get('/api-keys', settingsController.getApiKeys);
router.post('/api-keys', validate(schemas.settingsCreateApiKey), requirePrivilegedApiKeyReauth, settingsController.createApiKey);
router.delete('/api-keys/:tokenId', settingsController.revokeApiKey);

module.exports = router;
