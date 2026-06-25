const prisma = require('../config/database');
const crypto = require('node:crypto');

function parseDeviceInfo(userAgent = '') {
    const ua = String(userAgent || '').toLowerCase();

    let browser = 'Unknown Browser';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';

    let os = 'Unknown OS';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    let device = 'Desktop';
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) device = 'Mobile';
    else if (ua.includes('ipad') || ua.includes('tablet')) device = 'Tablet';

    return {
        browser,
        os,
        device,
        name: `${browser} on ${os}`,
    };
}

async function upsertTrustedDevice(userId, userAgent, ipAddress) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { trustedDevices: true },
    });

    const devices = Array.isArray(user?.trustedDevices) ? [...user.trustedDevices] : [];
    const details = parseDeviceInfo(userAgent);
    const now = new Date().toISOString();

    const existingIndex = devices.findIndex((device) =>
        device && device.ip === ipAddress && device.browser === details.browser && device.os === details.os
    );

    if (existingIndex >= 0) {
        devices[existingIndex] = {
            ...devices[existingIndex],
            name: details.name,
            browser: details.browser,
            os: details.os,
            ip: ipAddress,
            lastSeenAt: now,
        };
    } else {
        devices.unshift({
            id: crypto.randomUUID(),
            name: details.name,
            browser: details.browser,
            os: details.os,
            ip: ipAddress,
            createdAt: now,
            lastSeenAt: now,
        });
    }

    const limited = devices.slice(0, 25);

    await prisma.user.update({
        where: { id: userId },
        data: { trustedDevices: limited },
    });

    return limited;
}

module.exports = {
    parseDeviceInfo,
    upsertTrustedDevice,
};
