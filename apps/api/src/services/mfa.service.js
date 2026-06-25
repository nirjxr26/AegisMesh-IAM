const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('node:crypto');
const logger = require('../utils/logger');

/**
 * Generate a new TOTP secret
 */
function generateSecret() {
    return authenticator.generateSecret();
}

/**
 * Generate QR code data URL for authenticator app
 */
async function generateQRCode(email, secret) {
    const otpauth = authenticator.keyuri(email, 'IAM Auth System', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth);
    return qrCodeUrl;
}

/**
 * Verify a TOTP code against a secret
 */
function verifyTOTP(token, secret) {
    try {
        return authenticator.verify({ token, secret });
    } catch (error) {
        logger.error('TOTP verification error', { error: error.message });
        return false;
    }
}

/**
 * Generate backup codes (10 codes, 8 chars each)
 */
function generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
}

module.exports = {
    generateSecret,
    generateQRCode,
    verifyTOTP,
    generateBackupCodes,
};
