const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const prisma = require('../config/database');
const { decryptText } = require('../utils/crypto');
const { createAuditLog } = require('../utils/auditLog');

const REAUTH_HEADER = 'x-reauth-token';
const REAUTH_WINDOW_SECONDS = 10 * 60;
const REAUTH_TOKEN_SECRET = process.env.JWT_REAUTH_SECRET || process.env.JWT_ACCESS_SECRET;

if (!REAUTH_TOKEN_SECRET) {
    throw new Error(
        'Missing required authentication secret configuration'
    );
}

const SENSITIVE_ACTIONS = Object.freeze({
    CHANGE_PASSWORD: 'change_password',
    CHANGE_EMAIL: 'change_email',
    EXPORT_DATA: 'export_data',
    CREATE_PRIV_TOKEN: 'create_priv_token',
    DELETE_ACCOUNT: 'delete_account',
    DISABLE_MFA: 'disable_mfa',
    CHANGE_ORG_SETTINGS: 'change_org_settings',
    RESET_POLICIES: 'reset_policies',
    VIEW_BACKUP_CODES: 'view_backup_codes',
    REVOKE_ALL_SESSIONS: 'revoke_all_sessions',
});

function buildReauthError(action, requiresMfa) {
    const message = 'Please verify your identity to continue';

    return {
        success: false,
        code: 'REAUTH_REQUIRED',
        action,
        message,
        requiresMfa,
        error: {
            code: 'REAUTH_REQUIRED',
            action,
            message,
            requiresMfa,
        },
    };
}

function getProvidedCredentials(body = {}) {
    const password = body.password ?? body.currentPassword ?? '';
    const mfaToken = body.mfaToken ?? '';

    return {
        password: String(password || ''),
        mfaToken: String(mfaToken || '').trim(),
    };
}

function getReauthPayload(token) {
    try {
        const payload = jwt.verify(token, REAUTH_TOKEN_SECRET);
        if (payload?.type !== 'reauth') {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

function attachReauthHeader(res, token) {
    if (!token) {
        return;
    }

    res.set(REAUTH_HEADER, token);

    const current = res.getHeader('Access-Control-Expose-Headers');
    if (!current) {
        res.set('Access-Control-Expose-Headers', REAUTH_HEADER);
        return;
    }

    const currentValue = Array.isArray(current) ? current.join(', ') : String(current);
    const exposed = currentValue.split(',').map((item) => item.trim().toLowerCase());
    if (!exposed.includes(REAUTH_HEADER)) {
        res.set('Access-Control-Expose-Headers', `${currentValue}, ${REAUTH_HEADER}`);
    }
}

async function logFailure({ req, userId, sessionId, action, reason, errorCode = null }) {
    await createAuditLog({
        req,
        userId,
        sessionId,
        action: 'REAUTH_FAILED',
        category: 'SECURITY',
        resource: 'reauth',
        result: 'FAILURE',
        errorCode,
        metadata: {
            action,
            reason,
        },
    });
}

function issueReauthToken(userId, sessionId, method) {
    return jwt.sign(
        {
            sub: userId,
            sessionId: sessionId || null,
            type: 'reauth',
            method,
            reauthAt: new Date().toISOString(),
        },
        REAUTH_TOKEN_SECRET,
        { expiresIn: REAUTH_WINDOW_SECONDS }
    );
}

function requireReauth(action) {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const sessionId = req.user.sessionId || null;
            const existingToken = req.headers[REAUTH_HEADER];

            if (existingToken) {
                const payload = getReauthPayload(existingToken);
                const tokenSessionId = payload?.sessionId || null;

                if (payload?.sub === userId && tokenSessionId === sessionId) {
                    req.reauthed = true;
                    req.reauthedAt = payload?.reauthAt ? new Date(payload.reauthAt) : new Date();
                    req.reauthMethod = payload?.method || null;
                    return next();
                }
            }

            const { password, mfaToken } = getProvidedCredentials(req.body);
            if (!password && !mfaToken) {
                return res.status(403).json(buildReauthError(action, Boolean(req.user.mfaEnabled)));
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    passwordHash: true,
                    mfaEnabled: true,
                    mfaSecret: true,
                },
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'USER_001',
                        message: 'User not found',
                    },
                });
            }

            let method = null;
            let failure = null;

            if (password) {
                if (!user.passwordHash) {
                    failure = {
                        status: 400,
                        code: 'NO_PASSWORD',
                        message: 'Account uses OAuth login only. Use MFA to verify.',
                        reason: 'no_password',
                    };
                } else {
                    const validPassword = await bcrypt.compare(password, user.passwordHash);
                    if (validPassword) {
                        method = 'password';
                    } else {
                        failure = {
                            status: 401,
                            code: 'INVALID_PASSWORD',
                            message: 'Incorrect password',
                            reason: 'invalid_password',
                        };
                    }
                }
            }

            if (!method && mfaToken) {
                if (!user.mfaEnabled || !user.mfaSecret) {
                    failure = {
                        status: 400,
                        code: 'MFA_NOT_ENABLED',
                        message: 'MFA not enabled',
                        reason: 'mfa_not_enabled',
                    };
                } else {
                    const secret = decryptText(user.mfaSecret) || user.mfaSecret;
                    const validMfaToken = authenticator.verify({ token: mfaToken, secret });
                    if (validMfaToken) {
                        method = 'mfa';
                        failure = null;
                    } else if (!failure || failure.code === 'NO_PASSWORD') {
                        failure = {
                            status: 401,
                            code: 'INVALID_MFA_TOKEN',
                            message: 'Invalid authenticator code',
                            reason: 'invalid_mfa_token',
                        };
                    }
                }
            }

            if (!method) {
                await logFailure({
                    req,
                    userId,
                    sessionId,
                    action,
                    reason: failure?.reason || 'invalid_credentials',
                    errorCode: failure?.code || 'REAUTH_FAILED',
                });

                return res.status(failure?.status || 401).json({
                    success: false,
                    code: failure?.code || 'REAUTH_FAILED',
                    message: failure?.message || 'Verification failed',
                    error: {
                        code: failure?.code || 'REAUTH_FAILED',
                        message: failure?.message || 'Verification failed',
                    },
                });
            }

            const issuedAt = new Date();
            const reauthToken = issueReauthToken(userId, sessionId, method);

            attachReauthHeader(res, reauthToken);

            req.reauthed = true;
            req.reauthedAt = issuedAt;
            req.reauthMethod = method;

            await createAuditLog({
                req,
                userId,
                sessionId,
                action: 'REAUTH_VERIFIED',
                category: 'SECURITY',
                resource: 'reauth',
                result: 'SUCCESS',
                metadata: {
                    action,
                    method,
                },
            });

            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = {
    requireReauth,
    SENSITIVE_ACTIONS,
    REAUTH_HEADER,
};