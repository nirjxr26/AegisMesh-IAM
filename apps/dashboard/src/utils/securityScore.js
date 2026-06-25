export function daysSince(date) {
    if (!date) return Infinity;

    const timestamp = new Date(date).getTime();
    if (Number.isNaN(timestamp)) return Infinity;

    const ms = Date.now() - timestamp;
    return Math.floor(ms / 86400000);
}

function hasBackupCodes(user = {}) {
    if (user?.hasBackupCodes === true) {
        return true;
    }

    if (Array.isArray(user?.backupCodes) && user.backupCodes.length > 0) {
        return true;
    }

    if (Array.isArray(user?.mfaBackupCodes) && user.mfaBackupCodes.length > 0) {
        return true;
    }

    if (typeof user?.mfaBackupCodes === 'string') {
        try {
            const parsed = JSON.parse(user.mfaBackupCodes);
            return Array.isArray(parsed) && parsed.length > 0;
        } catch {
            return false;
        }
    }

    return false;
}

function getRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'At Risk';
}

export function calculateSecurityScore(user = {}, sessions = [], apiKeys = [], connectedApps = []) {
    const activeSessions = sessions?.filter((session) => session.isActive !== false) || [];
    const staleApiKeys = apiKeys?.filter((key) => key.isActive && key.lastUsedAt && daysSince(key.lastUsedAt) > 30) || [];
    const failedLoginsLast7Days = user.failedLoginsLast7Days ?? user.failedLoginCountLast7Days ?? user.failedLoginCount7d ?? 0;
    const connectedAppsReviewed =
        (connectedApps?.length || 0) === 0
        || connectedApps.every((app) => Boolean(app.reviewedAt || app.lastReviewedAt || app.isReviewed));

    const checks = [
        {
            id: 'mfa_enabled',
            label: 'Two-factor authentication',
            description: 'Your account is protected with an authenticator app',
            points: 20,
            passed: user.mfaEnabled === true,
            action: 'Enable MFA',
            actionPath: '/dashboard/security',
            actionTab: 'mfa',
            severity: 'critical',
        },
        {
            id: 'email_verified',
            label: 'Email address verified',
            description: 'Your recovery email is confirmed and active',
            points: 10,
            passed: user.emailVerified === true,
            action: 'Verify Email',
            actionPath: '/settings',
            actionTab: 'profile',
            severity: 'high',
        },
        {
            id: 'password_age',
            label: 'Password recently updated',
            description: 'Password changed within the last 90 days',
            points: 15,
            passed: (() => {
                if (!user.passwordChangedAt) {
                    return user.hasPassword === false;
                }

                return daysSince(user.passwordChangedAt) <= 90;
            })(),
            action: 'Update Password',
            actionPath: '/dashboard/security',
            actionTab: 'password',
            severity: 'medium',
        },
        {
            id: 'session_count',
            label: 'No excessive active sessions',
            description: 'You have a manageable number of active sessions',
            points: 10,
            passed: activeSessions.length <= 3,
            action: 'Review Sessions',
            actionPath: '/settings',
            actionTab: 'sessions',
            severity: 'medium',
        },
        {
            id: 'api_keys_clean',
            label: 'No stale API keys',
            description: 'All active API keys are recently used or newly created',
            points: 10,
            passed: staleApiKeys.length === 0,
            action: 'Review API Keys',
            actionPath: '/settings',
            actionTab: 'api-keys',
            severity: 'low',
        },
        {
            id: 'backup_codes',
            label: 'Backup codes saved',
            description: 'Recovery codes are set up for account access',
            points: 10,
            passed: user.mfaEnabled === true && hasBackupCodes(user),
            action: 'Generate Backup Codes',
            actionPath: '/dashboard/security',
            actionTab: 'mfa',
            severity: 'medium',
        },
        {
            id: 'connected_apps',
            label: 'Connected apps reviewed',
            description: 'No suspicious or unused app connections',
            points: 10,
            passed: connectedAppsReviewed,
            action: 'Review Connected Apps',
            actionPath: '/dashboard/security',
            actionTab: 'connected-apps',
            severity: 'low',
        },
        {
            id: 'no_failed_logins',
            label: 'No recent failed logins',
            description: 'No suspicious login attempts on your account',
            points: 15,
            passed: failedLoginsLast7Days === 0,
            action: 'View Login History',
            actionPath: '/dashboard/security',
            actionTab: 'history',
            severity: 'low',
        },
    ];

    const passed = checks.filter((check) => check.passed);
    const failed = checks.filter((check) => !check.passed);
    const critical = failed.filter((check) => check.severity === 'critical');
    const score = passed.reduce((sum, check) => sum + check.points, 0);

    return {
        score,
        rating: getRating(score),
        checks,
        passed,
        failed,
        critical,
    };
}