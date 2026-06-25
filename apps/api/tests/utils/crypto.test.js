'use strict';

const { encryptText, decryptText } = require('../../src/utils/crypto');

describe('encryptText', () => {
    it('returns null for falsy input', () => {
        expect(encryptText(null)).toBeNull();
        expect(encryptText(undefined)).toBeNull();
        expect(encryptText('')).toBeNull();
    });

    it('returns a colon-delimited string with three hex parts', () => {
        const result = encryptText('hello');
        expect(typeof result).toBe('string');
        const parts = result.split(':');
        expect(parts).toHaveLength(3);
        // iv (12 bytes = 24 hex chars), auth tag (16 bytes = 32 hex chars)
        expect(parts[0]).toHaveLength(24);
        expect(parts[1]).toHaveLength(32);
        expect(parts[2].length).toBeGreaterThan(0);
    });

    it('produces different ciphertext for the same plaintext (random IV)', () => {
        const a = encryptText('secret');
        const b = encryptText('secret');
        expect(a).not.toBe(b);
    });

    it('coerces non-string values to string before encrypting', () => {
        const result = encryptText(42);
        expect(typeof result).toBe('string');
        expect(result.split(':')).toHaveLength(3);
    });
});

describe('decryptText', () => {
    it('returns null for falsy input', () => {
        expect(decryptText(null)).toBeNull();
        expect(decryptText(undefined)).toBeNull();
        expect(decryptText('')).toBeNull();
    });

    it('round-trips plain text correctly', () => {
        const plain = 'my-secret-value';
        const cipher = encryptText(plain);
        expect(decryptText(cipher)).toBe(plain);
    });

    it('round-trips text with special characters', () => {
        const plain = 'p@$$w0rd!#%&*()\nNewline\tTab';
        expect(decryptText(encryptText(plain))).toBe(plain);
    });

    it('returns the raw string for legacy plaintext (no colons)', () => {
        const legacy = 'JBSWY3DPEHPK3PXP';
        expect(decryptText(legacy)).toBe(legacy);
    });

    it('returns the raw string for two-part format (legacy)', () => {
        const twopart = 'aabbcc:ddeeff';
        expect(decryptText(twopart)).toBe(twopart);
    });

    it('returns null when the auth tag is tampered', () => {
        const cipher = encryptText('data');
        const parts = cipher.split(':');
        // Corrupt the auth tag (second part)
        parts[1] = 'a'.repeat(parts[1].length);
        expect(decryptText(parts.join(':'))).toBeNull();
    });

    it('returns null when ciphertext is corrupted', () => {
        const cipher = encryptText('data');
        const parts = cipher.split(':');
        // Corrupt the encrypted body
        parts[2] = 'deadbeef'.repeat(4);
        expect(decryptText(parts.join(':'))).toBeNull();
    });

    it('coerces non-string input before decryption', () => {
        const plain = 'numeric-test';
        const cipher = encryptText(plain);
        // Pass as object wrapping toString
        const proxy = { toString: () => cipher };
        expect(decryptText(proxy)).toBe(plain);
    });
});
