'use strict';

const bcrypt = require('bcryptjs');

jest.mock('../../src/config/database', () => ({
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    },
    session: {
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
    revokedToken: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb({
        user: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        userRole: {
            createMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        session: {
            deleteMany: jest.fn(),
        },
    })),
}));

jest.mock('../../src/services/token.service', () => ({
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    createSession: jest.fn(),
    findSessionByToken: jest.fn(),
    deleteSession: jest.fn(),
    verifyRefreshToken: jest.fn(),
    rotateRefreshToken: jest.fn(),
    deleteAllUserSessions: jest.fn(),
    blacklistToken: jest.fn(),
    getUserSessions: jest.fn(),
}));

jest.mock('../../src/services/email.service', () => ({
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
}));

jest.mock('../../src/services/mfa.service', () => ({
    verifyTOTP: jest.fn(),
}));

jest.mock('../../src/utils/auditLog', () => ({
    auditAuth: {
        registered: jest.fn(),
        loginFailed: jest.fn(),
        loginSuccess: jest.fn().mockResolvedValue(),
        loginMFAFailed: jest.fn(),
        logout: jest.fn(),
        tokenRefreshed: jest.fn(),
        passwordResetRequested: jest.fn(),
        passwordReset: jest.fn(),
        emailVerified: jest.fn(),
    },
    auditSecurity: {
        accountLocked: jest.fn(),
        rateLimitExceeded: jest.fn(),
    },
    auditSession: {
        allRevoked: jest.fn(),
    },
    auditMFA: {
        backupCodeUsed: jest.fn(),
    },
}));

jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('../../src/services/organizationSettings.service', () => ({
    getOrganizationSettings: jest.fn(),
}));

jest.mock('../../src/utils/crypto', () => ({
    decryptText: jest.fn(),
    encryptText: jest.fn(),
}));

jest.mock('../../src/services/userSecurity.service', () => ({
    upsertTrustedDevice: jest.fn(),
}));

const authService = require('../../src/services/auth');
const prisma = require('../../src/config/database');
const tokenService = require('../../src/services/token.service');
const emailService = require('../../src/services/email.service');
const mfaService = require('../../src/services/mfa.service');
const auditLog = require('../../src/utils/auditLog');
const orgSettings = require('../../src/services/organizationSettings.service');
const cryptoUtil = require('../../src/utils/crypto');

const MOCK_USER = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$2a$12$hashedpassword',
    status: 'ACTIVE',
    emailVerified: true,
    mfaEnabled: false,
    mfaSecret: null,
    backupCodes: [],
    mfaBackupCodes: [],
    failedLoginCount: 0,
    lockedUntil: null,
    emailVerifyToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    passwordChangedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userRoles: [
        { role: { name: 'Admin' } },
    ],
};

function mockRequest(overrides = {}) {
    return {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Jest-Test-Agent' },
        ...overrides,
    };
}

describe('register', () => {
    afterEach(() => jest.clearAllMocks());

    it('creates a user and sends verification email', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        prisma.user.create.mockResolvedValue(MOCK_USER);
        emailService.sendVerificationEmail.mockResolvedValue({ previewUrl: 'http://preview' });

        const result = await authService.register({
            email: 'test@example.com',
            password: 'StrongP@ss1',
            firstName: 'Test',
            lastName: 'User',
            req: mockRequest(),
        });

        expect(result.userId).toBe(MOCK_USER.id);
        expect(result.message).toContain('Verification email sent');
        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    email: 'test@example.com',
                    firstName: 'Test',
                    lastName: 'User',
                }),
            })
        );
        expect(emailService.sendVerificationEmail).toHaveBeenCalled();
        expect(auditLog.auditAuth.registered).toHaveBeenCalled();
    });

    it('throws AUTH_009 when email already exists', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);

        await expect(authService.register({
            email: 'test@example.com',
            password: 'StrongP@ss1',
            firstName: 'Test',
            req: mockRequest(),
        })).rejects.toThrow('Email already registered');

        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('does not propagate email send failure', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        prisma.user.create.mockResolvedValue(MOCK_USER);
        emailService.sendVerificationEmail.mockRejectedValue(new Error('SMTP down'));

        const result = await authService.register({
            email: 'test@example.com',
            password: 'StrongP@ss1',
            firstName: 'Test',
            lastName: 'User',
            req: mockRequest(),
        });

        expect(result.userId).toBe(MOCK_USER.id);
    });
});

describe('login', () => {
    const VALID_PASSWORD = 'StrongP@ss1';

    afterEach(() => jest.clearAllMocks());

    function mockUser(overrides = {}) {
        return { ...MOCK_USER, ...overrides };
    }

    function setupSuccessMocks(userOverrides) {
        const user = mockUser(userOverrides);
        orgSettings.getOrganizationSettings.mockResolvedValue({ maxFailedAttempts: 5 });
        prisma.user.findUnique.mockResolvedValue(user);
        jest.spyOn(bcrypt, 'compare').mockImplementation((pw, _hash) => Promise.resolve(pw === VALID_PASSWORD));
        prisma.user.update.mockResolvedValue(user);
        tokenService.generateRefreshToken.mockReturnValue('refresh-token-value');
        tokenService.createSession.mockResolvedValue({ id: 'session-1' });
        tokenService.generateAccessToken.mockReturnValue('access-token-value');
        return user;
    }

    it('returns tokens for valid credentials', async () => {
        const user = setupSuccessMocks();
        prisma.user.update.mockResolvedValue({ ...user, failedLoginCount: 0, lockedUntil: null, status: 'ACTIVE' });

        const result = await authService.login({
            email: 'test@example.com',
            password: VALID_PASSWORD,
            req: mockRequest(),
        });

        expect(result.accessToken).toBe('access-token-value');
        expect(result.refreshToken).toBe('refresh-token-value');
        expect(result.user).toBeDefined();
        expect(result.user.hasPassword).toBe(true);
        expect(auditLog.auditAuth.loginSuccess).toHaveBeenCalled();
    });

    it('throws AUTH_001 when user not found', async () => {
        orgSettings.getOrganizationSettings.mockResolvedValue({ maxFailedAttempts: 5 });
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(authService.login({
            email: 'unknown@example.com',
            password: VALID_PASSWORD,
            req: mockRequest(),
        })).rejects.toThrow('Invalid credentials');

        expect(auditLog.auditAuth.loginFailed).toHaveBeenCalled();
    });

    it('throws AUTH_008 when user is INACTIVE', async () => {
        orgSettings.getOrganizationSettings.mockResolvedValue({ maxFailedAttempts: 5 });
        prisma.user.findUnique.mockResolvedValue(mockUser({ status: 'INACTIVE' }));

        await expect(authService.login({
            email: 'test@example.com',
            password: VALID_PASSWORD,
            req: mockRequest(),
        })).rejects.toThrow('Account inactive');
    });

    it('throws AUTH_002 when account is LOCKED', async () => {
        const lockedUntil = new Date(Date.now() + 3600000);
        orgSettings.getOrganizationSettings.mockResolvedValue({ maxFailedAttempts: 5 });
        prisma.user.findUnique.mockResolvedValue(mockUser({ status: 'LOCKED', lockedUntil }));

        await expect(authService.login({
            email: 'test@example.com',
            password: VALID_PASSWORD,
            req: mockRequest(),
        })).rejects.toThrow('Account locked');
    });

    it('resets lock and proceeds if lock has expired', async () => {
        const expiredLock = new Date(Date.now() - 3600000);
        const user = mockUser({ status: 'ACTIVE', lockedUntil: expiredLock });
        orgSettings.getOrganizationSettings.mockResolvedValue({ maxFailedAttempts: 5 });
        prisma.user.findUnique.mockResolvedValue(user);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
        prisma.user.update.mockResolvedValue({ ...user, status: 'ACTIVE', failedLoginCount: 0 });
        tokenService.generateRefreshToken.mockReturnValue('refresh-token');
        tokenService.createSession.mockResolvedValue({ id: 'session-1' });
        tokenService.generateAccessToken.mockReturnValue('access-token');

        const result = await authService.login({
            email: 'test@example.com',
            password: VALID_PASSWORD,
            req: mockRequest(),
        });

        expect(result.accessToken).toBe('access-token');
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE', failedLoginCount: 0 }) })
        );
    });

    it('throws AUTH_003 when email not verified', async () => {
        orgSettings.getOrganizationSettings.mockResolvedValue({ maxFailedAttempts: 5 });
        prisma.user.findUnique.mockResolvedValue(mockUser({ emailVerified: false }));

        await expect(authService.login({
            email: 'test@example.com',
            password: VALID_PASSWORD,
            req: mockRequest(),
        })).rejects.toThrow('Email not verified');
    });

    it('throws AUTH_001 for wrong password and increments failed count', async () => {
        const user = mockUser({ failedLoginCount: 0 });
        orgSettings.getOrganizationSettings.mockResolvedValue({ maxFailedAttempts: 5 });
        prisma.user.findUnique.mockResolvedValue(user);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
        prisma.user.update.mockResolvedValue(user);

        await expect(authService.login({
            email: 'test@example.com',
            password: 'wrong',
            req: mockRequest(),
        })).rejects.toThrow('Invalid credentials');

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ failedLoginCount: 1 }) })
        );
    });

    it('locks account after max failed attempts', async () => {
        const user = mockUser({ failedLoginCount: 4 });
        orgSettings.getOrganizationSettings.mockResolvedValue({ maxFailedAttempts: 5 });
        prisma.user.findUnique.mockResolvedValue(user);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
        prisma.user.update.mockResolvedValue(user);

        await expect(authService.login({
            email: 'test@example.com',
            password: 'wrong',
            req: mockRequest(),
        })).rejects.toThrow('Account locked');

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    failedLoginCount: 5,
                    status: 'LOCKED',
                    lockedUntil: expect.any(Date),
                }),
            })
        );
        expect(auditLog.auditSecurity.accountLocked).toHaveBeenCalled();
    });

    it('requires MFA code when user has MFA enabled', async () => {
        setupSuccessMocks({ mfaEnabled: true });

        await expect(authService.login({
            email: 'test@example.com',
            password: VALID_PASSWORD,
            req: mockRequest(),
        })).rejects.toThrow('MFA code required');
    });

    it('validates MFA code successfully', async () => {
        const user = setupSuccessMocks({ mfaEnabled: true, mfaSecret: 'encrypted-secret' });
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
        prisma.user.update.mockResolvedValue({ ...user, failedLoginCount: 0 });
        cryptoUtil.decryptText.mockReturnValue('decrypted-secret');
        mfaService.verifyTOTP.mockReturnValue(true);

        const result = await authService.login({
            email: 'test@example.com',
            password: VALID_PASSWORD,
            totpCode: '123456',
            req: mockRequest(),
        });

        expect(result.accessToken).toBe('access-token-value');
        expect(mfaService.verifyTOTP).toHaveBeenCalledWith('123456', 'decrypted-secret');
    });

    it('throws AUTH_005 for invalid MFA code', async () => {
        setupSuccessMocks({ mfaEnabled: true, mfaSecret: 'encrypted-secret' });
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
        cryptoUtil.decryptText.mockReturnValue('decrypted-secret');
        mfaService.verifyTOTP.mockReturnValue(false);

        await expect(authService.login({
            email: 'test@example.com',
            password: VALID_PASSWORD,
            totpCode: '000000',
            req: mockRequest(),
        })).rejects.toThrow('Invalid MFA code');

        expect(auditLog.auditAuth.loginMFAFailed).toHaveBeenCalled();
    });

    it('accepts a valid backup code for MFA login', async () => {
        const realBcrypt = jest.requireActual('bcryptjs');
        const hashedBackup = realBcrypt.hashSync('ABCD1234', 12);

        const user = mockUser({ mfaEnabled: true, mfaSecret: 'encrypted-secret', backupCodes: [hashedBackup] });
        orgSettings.getOrganizationSettings.mockResolvedValue({ maxFailedAttempts: 5 });
        prisma.user.findUnique.mockResolvedValue(user);
        jest.spyOn(bcrypt, 'compare').mockImplementation((pw, hash) => {
            if (pw === VALID_PASSWORD) return Promise.resolve(true);
            if (hash === hashedBackup) return Promise.resolve(true);
            return Promise.resolve(false);
        });
        tokenService.generateRefreshToken.mockReturnValue('refresh-tok');
        tokenService.createSession.mockResolvedValue({ id: 'session-1' });
        tokenService.generateAccessToken.mockReturnValue('access-tok');
        prisma.user.update.mockResolvedValue({ ...user, backupCodes: [] });

        const result = await authService.login({
            email: 'test@example.com',
            password: VALID_PASSWORD,
            totpCode: 'abcd1234',
            req: mockRequest(),
        });

        expect(result.accessToken).toBe('access-tok');
        expect(auditLog.auditMFA.backupCodeUsed).toHaveBeenCalled();
    });
});

describe('logout', () => {
    afterEach(() => jest.clearAllMocks());

    it('deletes session and blacklists access token', async () => {
        tokenService.findSessionByToken.mockResolvedValue({ id: 'session-1' });
        tokenService.deleteSession.mockResolvedValue(true);
        tokenService.blacklistToken.mockResolvedValue(true);

        const result = await authService.logout({
            refreshToken: 'refresh-tok',
            accessToken: 'access-tok',
            userId: 'user-1',
            req: mockRequest(),
        });

        expect(result.message).toBe('Logged out successfully');
        expect(tokenService.deleteSession).toHaveBeenCalledWith('refresh-tok');
        expect(tokenService.blacklistToken).toHaveBeenCalledWith('access-tok');
        expect(auditLog.auditAuth.logout).toHaveBeenCalled();
    });

    it('uses sessionId from req.user when refresh token has no session', async () => {
        tokenService.findSessionByToken.mockResolvedValue(null);

        await authService.logout({
            refreshToken: 'refresh-tok',
            userId: 'user-1',
            req: mockRequest({ user: { sessionId: 'sess-from-req' } }),
        });

        expect(auditLog.auditAuth.logout).toHaveBeenCalledWith(
            expect.anything(), 'user-1', 'sess-from-req'
        );
    });
});

describe('refreshAccessToken', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns new tokens for a valid refresh token', async () => {
        const payload = { sub: 'user-1', jti: 'jti-1' };
        tokenService.verifyRefreshToken.mockReturnValue(payload);
        tokenService.findSessionByToken.mockResolvedValue({
            id: 'session-1',
            userId: 'user-1',
            expiresAt: new Date(Date.now() + 86400000),
            user: MOCK_USER,
        });
        tokenService.rotateRefreshToken.mockResolvedValue({
            refreshToken: 'new-refresh',
            session: { id: 'session-2' },
        });
        tokenService.generateAccessToken.mockReturnValue('new-access');

        const result = await authService.refreshAccessToken({
            refreshToken: 'valid-refresh',
            req: mockRequest(),
        });

        expect(result.accessToken).toBe('new-access');
        expect(result.refreshToken).toBe('new-refresh');
        expect(auditLog.auditAuth.tokenRefreshed).toHaveBeenCalled();
    });

    it('throws AUTH_006 when token verification fails', async () => {
        tokenService.verifyRefreshToken.mockReturnValue(null);

        await expect(authService.refreshAccessToken({
            refreshToken: 'invalid',
            req: mockRequest(),
        })).rejects.toThrow('Token expired');
    });

    it('throws AUTH_007 when session is not found', async () => {
        tokenService.verifyRefreshToken.mockReturnValue({ sub: 'user-1' });
        tokenService.findSessionByToken.mockResolvedValue(null);

        await expect(authService.refreshAccessToken({
            refreshToken: 'orphaned',
            req: mockRequest(),
        })).rejects.toThrow('Token invalid');
    });

    it('throws AUTH_006 and deletes session when session is expired', async () => {
        tokenService.verifyRefreshToken.mockReturnValue({ sub: 'user-1' });
        tokenService.findSessionByToken.mockResolvedValue({
            id: 'session-1',
            expiresAt: new Date(Date.now() - 3600000),
        });

        await expect(authService.refreshAccessToken({
            refreshToken: 'expired',
            req: mockRequest(),
        })).rejects.toThrow('Token expired');

        expect(tokenService.deleteSession).toHaveBeenCalledWith('expired');
    });
});

describe('forgotPassword', () => {
    afterEach(() => jest.clearAllMocks());

    it('updates user with reset token and sends email', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        emailService.sendPasswordResetEmail.mockResolvedValue({});

        const result = await authService.forgotPassword({
            email: 'test@example.com',
            req: mockRequest(),
        });

        expect(result.message).toContain('If an account exists');
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
                data: expect.objectContaining({
                    passwordResetToken: expect.any(String),
                    passwordResetExpires: expect.any(Date),
                }),
            })
        );
        expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
        expect(auditLog.auditAuth.passwordResetRequested).toHaveBeenCalled();
    });

    it('returns same message for unknown email (prevent enumeration)', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        const result = await authService.forgotPassword({
            email: 'unknown@example.com',
            req: mockRequest(),
        });

        expect(result.message).toContain('If an account exists');
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('does not fail when email send fails', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        emailService.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP error'));

        const result = await authService.forgotPassword({
            email: 'test@example.com',
            req: mockRequest(),
        });

        expect(result.message).toBeDefined();
    });
});

describe('resetPassword', () => {
    afterEach(() => jest.clearAllMocks());

    it('resets password, clears sessions and returns success', async () => {
        prisma.user.findFirst.mockResolvedValue(MOCK_USER);
        tokenService.deleteAllUserSessions.mockResolvedValue({ count: 2 });

        const result = await authService.resetPassword({
            token: 'valid-token',
            newPassword: 'NewStr0ng!',
            req: mockRequest(),
        });

        expect(result.message).toBe('Password reset successful');
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
                data: expect.objectContaining({
                    passwordHash: expect.any(String),
                    passwordResetToken: null,
                    passwordResetExpires: null,
                    status: 'ACTIVE',
                    failedLoginCount: 0,
                    lockedUntil: null,
                }),
            })
        );
        expect(tokenService.deleteAllUserSessions).toHaveBeenCalledWith('user-1');
        expect(auditLog.auditAuth.passwordReset).toHaveBeenCalled();
        expect(auditLog.auditSession.allRevoked).toHaveBeenCalled();
    });

    it('throws AUTH_010 when token is invalid or expired', async () => {
        prisma.user.findFirst.mockResolvedValue(null);

        await expect(authService.resetPassword({
            token: 'bad-token',
            newPassword: 'NewStr0ng!',
            req: mockRequest(),
        })).rejects.toThrow('Invalid reset token');
    });
});

describe('verifyEmail', () => {
    afterEach(() => jest.clearAllMocks());

    it('verifies user email successfully', async () => {
        prisma.user.findFirst.mockResolvedValue(MOCK_USER);

        const result = await authService.verifyEmail({
            token: 'valid-token',
            req: mockRequest(),
        });

        expect(result.message).toBe('Email verified successfully');
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'user-1' },
                data: expect.objectContaining({
                    emailVerified: true,
                    emailVerifyToken: null,
                }),
            })
        );
        expect(auditLog.auditAuth.emailVerified).toHaveBeenCalled();
    });

    it('throws AUTH_007 when token is invalid', async () => {
        prisma.user.findFirst.mockResolvedValue(null);

        await expect(authService.verifyEmail({
            token: 'bad-token',
            req: mockRequest(),
        })).rejects.toThrow('Invalid verification token');
    });
});

describe('getProfile', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns sanitized user profile', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);

        const profile = await authService.getProfile('user-1');

        expect(profile.id).toBe('user-1');
        expect(profile.email).toBe('test@example.com');
        expect(profile.passwordHash).toBeUndefined();
        expect(profile.mfaSecret).toBeNull();
        expect(profile.role).toBe('Admin');
        expect(profile.hasPassword).toBe(true);
    });

    it('throws AUTH_007 when user not found', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(authService.getProfile('nonexistent')).rejects.toThrow('Token invalid');
    });

    it('assigns SuperAdmin role when user has it', async () => {
        const superAdminUser = {
            ...MOCK_USER,
            userRoles: [{ role: { name: 'SuperAdmin' } }, { role: { name: 'User' } }],
        };
        prisma.user.findUnique.mockResolvedValue(superAdminUser);

        const profile = await authService.getProfile('user-1');

        expect(profile.role).toBe('SuperAdmin');
    });

    it('returns role as null when user has no roles', async () => {
        prisma.user.findUnique.mockResolvedValue({ ...MOCK_USER, userRoles: [] });

        const profile = await authService.getProfile('user-1');

        expect(profile.role).toBeNull();
    });
});
