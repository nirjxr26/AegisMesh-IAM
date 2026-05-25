const crypto = require('node:crypto');

const ALGO = 'aes-256-gcm';

function buildKey() {
    const seed = process.env.MFA_SECRET_ENCRYPTION_KEY || process.env.JWT_REFRESH_SECRET || 'dev-mfa-secret-key';
    return crypto.createHash('sha256').update(seed).digest();
}

function encryptText(plainText) {
    if (!plainText) return null;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, buildKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptText(payload) {
    if (!payload) return null;

    const text = String(payload);
    const parts = text.split(':');

    // Backward compatibility for legacy plaintext secrets.
    if (parts.length !== 3) {
        return text;
    }

    try {
        const [ivHex, tagHex, encryptedHex] = parts;
        const decipher = crypto.createDecipheriv(
            ALGO,
            buildKey(),
            Buffer.from(ivHex, 'hex')
        );
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encryptedHex, 'hex')),
            decipher.final(),
        ]);

        return decrypted.toString('utf8');
    } catch {
        return null;
    }
}

module.exports = {
    encryptText,
    decryptText,
};
