const Joi = require('joi');

// Password must be min 8 chars, with uppercase, lowercase, number, special char
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/;
const reauthFields = {
    password: Joi.string().allow('', null),
    currentPassword: Joi.string().allow('', null),
    mfaToken: Joi.string().min(6).max(8).allow('', null),
};

const schemas = {
    register: {
        body: Joi.object({
            email: Joi.string().email().required().messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required',
            }),
            password: Joi.string()
                .min(8)
                .pattern(passwordPattern)
                .required()
                .messages({
                    'string.min': 'Password must be at least 8 characters',
                    'string.pattern.base':
                        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
                    'any.required': 'Password is required',
                }),
            firstName: Joi.string().min(1).max(50).required().messages({
                'any.required': 'First name is required',
            }),
            lastName: Joi.string().min(1).max(50).required().messages({
                'any.required': 'Last name is required',
            }),
        }),
    },

    login: {
        body: Joi.object({
            email: Joi.string().email().required().messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required',
            }),
            password: Joi.string().required().messages({
                'any.required': 'Password is required',
            }),
            totpCode: Joi.string().min(6).max(8).optional().allow('').messages({
                'string.min': 'Code must be at least 6 characters',
                'string.max': 'Code must be at most 8 characters',
            }),
        }),
    },

    forgotPassword: {
        body: Joi.object({
            email: Joi.string().email().required().messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required',
            }),
        }),
    },

    resetPassword: {
        body: Joi.object({
            token: Joi.string().required().messages({
                'any.required': 'Reset token is required',
            }),
            newPassword: Joi.string()
                .min(8)
                .pattern(passwordPattern)
                .required()
                .messages({
                    'string.min': 'Password must be at least 8 characters',
                    'string.pattern.base':
                        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                    'any.required': 'New password is required',
                }),
        }),
    },

    verifyEmail: {
        body: Joi.object({
            token: Joi.string().required().messages({
                'any.required': 'Verification token is required',
            }),
        }),
    },

    refreshToken: {
        body: Joi.object({
            refreshToken: Joi.string().optional(),
        }),
    },

    mfaVerifySetup: {
        body: Joi.object({
            totpCode: Joi.string().length(6).required().messages({
                'string.length': 'TOTP code must be 6 digits',
                'any.required': 'TOTP code is required',
            }),
        }),
    },

    mfaDisable: {
        body: Joi.object({
            totpCode: Joi.string().length(6).required().messages({
                'string.length': 'TOTP code must be 6 digits',
                'any.required': 'TOTP code is required',
            }),
            password: Joi.string().required().messages({
                'any.required': 'Password is required',
            }),
        }),
    },

    // ═══════════════════════════════════════
    // RBAC SCHEMAS
    // ═══════════════════════════════════════

    role: {
        body: Joi.object({
            name: Joi.string().min(2).max(50).required().messages({
                'string.min': 'Role name must be at least 2 characters',
                'any.required': 'Role name is required',
            }),
            description: Joi.string().max(255).optional().allow(''),
        }),
    },

    policy: {
        body: Joi.object({
            name: Joi.string().min(2).max(100).required(),
            description: Joi.string().max(255).optional().allow(''),
            effect: Joi.string().valid('ALLOW', 'DENY').required(),
            actions: Joi.array().items(Joi.string()).min(1).required(),
            resources: Joi.array().items(Joi.string()).min(1).required(),
            conditions: Joi.object().optional(),
        }),
    },

    group: {
        body: Joi.object({
            name: Joi.string().min(2).max(50).required(),
            description: Joi.string().max(255).optional().allow(''),
        }),
    },

    groupMember: {
        body: Joi.object({
            userId: Joi.string().uuid().required(),
        }),
    },

    groupRole: {
        body: Joi.object({
            roleId: Joi.string().uuid().required(),
        }),
    },

    rolePolicy: {
        body: Joi.object({
            policyId: Joi.string().uuid().required(),
        }),
    },

    assignRole: {
        body: Joi.object({
            roleId: Joi.string().uuid().required(),
        }),
    },

    policySimulation: {
        body: Joi.object({
            userId: Joi.string().uuid().optional(),
            action: Joi.string().required(),
            resource: Joi.string().required(),
            context: Joi.object().optional(),
        }),
    },

    // ═══════════════════════════════════════
    // AUDIT SCHEMAS
    // ═══════════════════════════════════════

    auditExport: {
        body: Joi.object({
            category: Joi.string().optional(),
            userId: Joi.string().uuid().optional(),
            startDate: Joi.date().optional(),
            endDate: Joi.date().optional(),
            format: Joi.string().valid('csv', 'json').default('csv'),
        }),
    },

    // ═══════════════════════════════════════
    // USER MANAGEMENT SCHEMAS
    // ═══════════════════════════════════════

    createUserSchema: {
        body: Joi.object({
            email: Joi.string().email().required(),
            firstName: Joi.string().min(2).max(50).required(),
            lastName: Joi.string().min(2).max(50).required(),
            password: Joi.string().min(8)
                .pattern(passwordPattern)
                .required()
                .messages({
                    'string.pattern.base': 'Password must have uppercase, lowercase, number and special char',
                }),
            status: Joi.string().valid('ACTIVE', 'INACTIVE', 'LOCKED').default('ACTIVE'),
            roleIds: Joi.array().items(Joi.string().uuid()).optional(),
            sendWelcomeEmail: Joi.boolean().default(false),
        }),
    },

    updateUserSchema: {
        body: Joi.object({
            email: Joi.string().email(),
            firstName: Joi.string().min(2).max(50),
            lastName: Joi.string().min(2).max(50),
            status: Joi.string().valid('ACTIVE', 'INACTIVE', 'LOCKED'),
            roleIds: Joi.array().items(Joi.string().uuid()),
        }).min(1),
    },

    updateStatusSchema: {
        body: Joi.object({
            status: Joi.string().valid('ACTIVE', 'INACTIVE', 'LOCKED').required().messages({
                'any.only': 'Status must be ACTIVE, INACTIVE or LOCKED',
            }),
        }),
    },

    bulkStatusSchema: {
        body: Joi.object({
            userIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
            status: Joi.string().valid('ACTIVE', 'INACTIVE', 'LOCKED').required(),
        }),
    },

    bulkRolesSchema: {
        body: Joi.object({
            userIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
            roleIds: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
            action: Joi.string().valid('assign', 'remove').required(),
        }),
    },

    bulkGroupsSchema: {
        body: Joi.object({
            userIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
            groupIds: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
            action: Joi.string().valid('add', 'remove').required(),
        }),
    },

    bulkDeleteSchema: {
        body: Joi.object({
            userIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
            confirmPhrase: Joi.string().required(),
        }),
    },

    bulkExportSchema: {
        body: Joi.object({
            userIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
            format: Joi.string().valid('csv', 'json').default('csv'),
        }),
    },

    roleTemplateApply: {
        params: Joi.object({
            templateId: Joi.string().required(),
        }),
        body: Joi.object({
            roleName: Joi.string().min(2).max(80).allow('', null),
            description: Joi.string().max(255).allow('', null),
            assignToUserIds: Joi.array().items(Joi.string().uuid()).max(100).optional(),
            assignToGroupIds: Joi.array().items(Joi.string().uuid()).max(100).optional(),
        }),
    },

    // ═══════════════════════════════════════
    // SETTINGS SCHEMAS
    // ═══════════════════════════════════════

    settingsProfileUpdate: {
        body: Joi.object({
            firstName: Joi.string().max(50).required(),
            lastName: Joi.string().max(50).required(),
            jobTitle: Joi.string().allow('', null),
            department: Joi.string().allow('', null),
            timezone: Joi.string().allow('', null),
            language: Joi.string().valid('en', 'es', 'fr', 'de', 'ja', 'zh').allow('', null),
        }),
    },

    settingsChangePassword: {
        body: Joi.object({
            currentPassword: Joi.string().allow('', null),
            newPassword: Joi.string().required(),
            confirmPassword: Joi.string().required(),
            mfaToken: Joi.string().min(6).max(8).allow('', null),
        }),
    },

    settingsMfaVerify: {
        body: Joi.object({
            token: Joi.string().min(6).max(8).required(),
            secret: Joi.string().required(),
            stateToken: Joi.string().optional(),
        }),
    },

    settingsPasswordConfirm: {
        body: Joi.object({
            ...reauthFields,
        }).or('password', 'currentPassword', 'mfaToken'),
    },

    settingsNotificationsUpdate: {
        body: Joi.object({
            newLoginEmail: Joi.boolean(),
            newLoginInApp: Joi.boolean(),
            passwordChangedEmail: Joi.boolean(),
            passwordChangedInApp: Joi.boolean(),
            mfaDisabledEmail: Joi.boolean(),
            mfaDisabledInApp: Joi.boolean(),
            userCreatedEmail: Joi.boolean(),
            userCreatedInApp: Joi.boolean(),
            roleAssignedEmail: Joi.boolean(),
            roleAssignedInApp: Joi.boolean(),
            policyChangedEmail: Joi.boolean(),
            policyChangedInApp: Joi.boolean(),
            failedLoginEmail: Joi.boolean(),
            failedLoginInApp: Joi.boolean(),
            sessionRevokedEmail: Joi.boolean(),
            sessionRevokedInApp: Joi.boolean(),
            accessChangedEmail: Joi.boolean(),
            accessChangedInApp: Joi.boolean(),
            auditExportEmail: Joi.boolean(),
            auditExportInApp: Joi.boolean(),
        }).min(1),
    },

    notificationsList: {
        query: Joi.object({
            unreadOnly: Joi.boolean().default(false),
            type: Joi.string().valid('security', 'access', 'role', 'account', 'system').optional(),
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(50).default(20),
        }),
    },

    notificationIdParam: {
        params: Joi.object({
            id: Joi.string().uuid().required(),
        }),
    },

    notificationReadUpdate: {
        params: Joi.object({
            id: Joi.string().uuid().required(),
        }),
        body: Joi.object({
            read: Joi.boolean().default(true),
        }),
    },

    settingsOrganizationUpdate: {
        body: Joi.object({
            orgName: Joi.string().max(120),
            plan: Joi.string().valid('free', 'pro', 'enterprise'),
            region: Joi.string().max(64),
            minPasswordLength: Joi.number().integer().min(6).max(32),
            requireUppercase: Joi.boolean(),
            requireNumber: Joi.boolean(),
            requireSymbol: Joi.boolean(),
            passwordExpiryDays: Joi.alternatives().try(Joi.number().integer().min(1).max(365), Joi.valid(null)),
            maxFailedAttempts: Joi.number().integer().min(1).max(20),
            sessionTimeoutMinutes: Joi.number().integer().min(15).max(10080),
            requireMfaForAll: Joi.boolean(),
            allowOAuthLogin: Joi.boolean(),
            ipAllowlist: Joi.array().items(Joi.string().trim()),
        }).min(1),
    },

    settingsResetPolicies: {
        body: Joi.object({
            ...reauthFields,
        }).or('password', 'currentPassword', 'mfaToken'),
    },

    settingsCreateApiKey: {
        body: Joi.object({
            name: Joi.string().max(80).required(),
            scopes: Joi.array().items(Joi.string()).min(1).required(),
            expiresIn: Joi.alternatives().try(Joi.number().integer().min(1).max(3650), Joi.valid(null)),
            password: Joi.string().allow('', null),
            mfaToken: Joi.string().min(6).max(8).allow('', null),
        }),
    },
};

module.exports = schemas;
