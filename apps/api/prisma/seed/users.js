const {
    uuidv4,
    IP_POOL,
    hoursAgo,
    daysAgo,
    hoursFrom,
    toIso,
    userProfiles,
    roleDistribution,
    toPrismaUserStatus,
    USER_AGENTS,
    now,
} = require('./data');

const users = userProfiles.map(([firstName, lastName], idx) => {
    const emailLocal = idx === 0
        ? 'admin'
        : `${firstName}.${lastName}`
            .toLowerCase()
            .replace(/[^a-z.]/g, '')
            .replace(/\.{2,}/g, '.');

    let status;
    if (idx < 18) {
        status = 'active';
    } else if (idx < 22) {
        status = 'locked';
    } else {
        status = 'pending';
    }

    const emailVerified = idx < 20;
    let mfaEnabled;
    if (idx === 0) {
        mfaEnabled = false;
    } else {
        mfaEnabled = idx < 15;
    }

    let mfaType = null;
    if (mfaEnabled) {
        if (idx % 4 === 0) mfaType = 'sms';
        else mfaType = 'totp';
    }

    let lastLoginAt = null;
    if (idx < 10) {
        const within24hOffsets = [1, 2, 3, 5, 7, 9, 12, 15, 18, 22];
        lastLoginAt = toIso(hoursAgo(within24hOffsets[idx]));
    } else if (idx < 18) {
        const within7dOffsets = [2, 2.5, 3, 3.5, 4, 5, 6, 6.75];
        lastLoginAt = toIso(daysAgo(within7dOffsets[idx - 10]));
    } else if (idx < 22) {
        const within30dOffsets = [10, 15, 21, 28];
        lastLoginAt = toIso(daysAgo(within30dOffsets[idx - 18]));
    }

    const createdAt = toIso(daysAgo(360 - idx * 12));
    const updatedAt = toIso(hoursFrom(createdAt, 48 + idx * 6));

    return {
        id: uuidv4(),
        firstName,
        lastName,
        email: `${emailLocal}@northbridge.io`,
        passwordHash: '<bcrypt hash placeholder>',
        status,
        emailVerified,
        mfaEnabled,
        mfaType,
        roleId: roleDistribution[idx],
        lastLoginAt,
        createdAt,
        updatedAt,
        loginAttempts: status === 'locked' ? 3 : idx % 3,
        ipAddress: IP_POOL[idx % IP_POOL.length],
    };
});

const sessions = Array.from({ length: 8 }, (_, idx) => {
    const createdAt = toIso(hoursAgo((idx % 8) + 1));
    const expiresAt = toIso(hoursFrom(createdAt, 12 + (idx % 13)));
    const lastActiveAt = toIso(hoursFrom(createdAt, (idx % 2) * 0.3 + 0.2));

    const browserVariants = ['Chrome 124', 'Firefox 125', 'Safari 17', 'Chrome 124'];
    const osVariants = ['macOS 14', 'Windows 11', 'iOS 17', 'Ubuntu 22'];
    const deviceVariants = ['desktop', 'desktop', 'mobile', 'desktop'];

    return {
        id: uuidv4(),
        userId: users[idx].id,
        userEmail: users[idx].email,
        ipAddress: IP_POOL[idx % IP_POOL.length],
        userAgent: USER_AGENTS[idx % USER_AGENTS.length],
        browser: browserVariants[idx % browserVariants.length],
        os: osVariants[idx % osVariants.length],
        device: deviceVariants[idx % deviceVariants.length],
        isCurrent: idx === 0,
        createdAt,
        expiresAt,
        lastActiveAt,
    };
});

async function seedUsers(prisma, passwordHash) {
    await prisma.user.createMany({
        data: users.map((user, idx) => ({
            id: user.id,
            email: user.email,
            passwordHash,
            firstName: user.firstName,
            lastName: user.lastName,
            status: toPrismaUserStatus(user.status),
            emailVerified: user.emailVerified,
            emailVerifyToken: user.emailVerified ? null : `verify-${user.id}`,
            mfaEnabled: user.mfaEnabled,
            mfaSecret: user.mfaEnabled ? `JBSWY3DPEHPK3PXP${idx}` : null,
            mfaBackupCodes: user.mfaEnabled
                ? JSON.stringify([
                    `${(100000 + idx * 11).toString()}`,
                    `${(200000 + idx * 13).toString()}`,
                    `${(300000 + idx * 17).toString()}`,
                    `${(400000 + idx * 19).toString()}`,
                    `${(500000 + idx * 23).toString()}`,
                    `${(600000 + idx * 29).toString()}`,
                ])
                : null,
            passwordChangedAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
            failedLoginCount: user.loginAttempts,
            lockedUntil: user.status === 'locked' ? hoursFrom(now.toISOString(), 24 + idx) : null,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
        })),
    });
}

async function seedSessions(prisma) {
    await prisma.session.createMany({
        data: sessions.map((session) => ({
            id: session.id,
            userId: session.userId,
            refreshToken: `seed-rt-${session.id}`,
            ipAddress: session.ipAddress,
            deviceInfo: JSON.stringify({
                userEmail: session.userEmail,
                userAgent: session.userAgent,
                browser: session.browser,
                os: session.os,
                device: session.device,
                isCurrent: session.isCurrent,
                lastActiveAt: session.lastActiveAt,
            }),
            createdAt: new Date(session.createdAt),
            expiresAt: new Date(session.expiresAt),
        })),
    });
}

module.exports = { users, sessions, seedUsers, seedSessions };
