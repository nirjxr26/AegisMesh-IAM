'use strict';

jest.mock('../../src/config/redis', () => require('../helpers/redisMock'));

// Mock prisma before the module is loaded
jest.mock('../../src/config/database', () => ({
    userRole: { findMany: jest.fn() },
    userGroup: { findMany: jest.fn() },
}));

const prisma = require('../../src/config/database');
const {
    matchesAllowlist,
    normalizeIp,
    isValidIpOrCidr,
    isValidTimezone,
    passwordPolicyErrors,
    mergeNotificationPreferences,
    DEFAULT_NOTIFICATION_PREFERENCES,
    ALLOWED_LANGUAGES,
} = require('../../src/services/organizationSettings.service');
const { LOOPBACK_IP, LOOPBACK_V6, IPV4_MAPPED_PREFIX } = require('../../src/config/constants');
const IP = require('../helpers/ipConstants');

// ---------------------------------------------------------------------------
// normalizeIp
// ---------------------------------------------------------------------------
describe('normalizeIp', () => {
    it('returns empty string for falsy input', () => {
        expect(normalizeIp('')).toBe('');
        expect(normalizeIp(null)).toBe('');
        expect(normalizeIp(undefined)).toBe('');
    });

    it('converts IPv6 loopback to loopback constant', () => {
        expect(normalizeIp(LOOPBACK_V6)).toBe(LOOPBACK_IP);
    });

    it('strips IPv4-mapped prefix', () => {
        expect(normalizeIp(`${IPV4_MAPPED_PREFIX}${IP.SAMPLE_IPV4_B}`)).toBe(IP.SAMPLE_IPV4_B);
    });

    it('returns plain IPv4 unchanged', () => {
        expect(normalizeIp(IP.SAMPLE_IPV4_C)).toBe(IP.SAMPLE_IPV4_C);
    });

    it('returns plain IPv6 unchanged', () => {
        expect(normalizeIp(IP.SAMPLE_IPV6)).toBe(IP.SAMPLE_IPV6);
    });
});

// ---------------------------------------------------------------------------
// isValidIpOrCidr
// ---------------------------------------------------------------------------
describe('isValidIpOrCidr', () => {
    it('returns false for falsy / empty input', () => {
        expect(isValidIpOrCidr(null)).toBe(false);
        expect(isValidIpOrCidr(undefined)).toBe(false);
        expect(isValidIpOrCidr('')).toBe(false);
        expect(isValidIpOrCidr('   ')).toBe(false);
    });

    it('accepts valid IPv4 addresses', () => {
        expect(isValidIpOrCidr(IP.SAMPLE_IPV4_B)).toBe(true);
        expect(isValidIpOrCidr(IP.SAMPLE_IPV4_ALL)).toBe(true);
        expect(isValidIpOrCidr(IP.SAMPLE_IPV4_BROADCAST)).toBe(true);
    });

    it('accepts valid IPv6 addresses', () => {
        expect(isValidIpOrCidr(LOOPBACK_V6)).toBe(true);
        expect(isValidIpOrCidr(IP.SAMPLE_IPV6)).toBe(true);
    });

    it('accepts valid CIDR notation (IPv4)', () => {
        expect(isValidIpOrCidr(IP.SAMPLE_IPV4_CIDR_8)).toBe(true);
        expect(isValidIpOrCidr(IP.SAMPLE_IPV4_CIDR_24_192)).toBe(true);
        expect(isValidIpOrCidr(IP.SAMPLE_IPV4_CIDR_ALL)).toBe(true);
    });

    it('accepts valid CIDR notation (IPv6)', () => {
        expect(isValidIpOrCidr(IP.SAMPLE_IPV6_CIDR)).toBe(true);
    });

    it('rejects out-of-range CIDR prefix (IPv4)', () => {
        expect(isValidIpOrCidr(IP.SAMPLE_IPV4_CIDR_INVALID_33)).toBe(false);
        expect(isValidIpOrCidr(IP.SAMPLE_IPV4_CIDR_NEG)).toBe(false);
    });

    it('rejects malformed values', () => {
        expect(isValidIpOrCidr('not-an-ip')).toBe(false);
        expect(isValidIpOrCidr(IP.MALFORMED_IP)).toBe(false);
        expect(isValidIpOrCidr(IP.SAMPLE_CIDR_EXTRA)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isValidTimezone
// ---------------------------------------------------------------------------
describe('isValidTimezone', () => {
    it('accepts valid IANA timezones', () => {
        expect(isValidTimezone('America/New_York')).toBe(true);
        expect(isValidTimezone('UTC')).toBe(true);
        expect(isValidTimezone('Europe/London')).toBe(true);
    });

    it('rejects invalid timezones', () => {
        expect(isValidTimezone('Fake/Timezone')).toBe(false);
        expect(isValidTimezone('')).toBe(false);
        expect(isValidTimezone('not-a-tz')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// passwordPolicyErrors
// ---------------------------------------------------------------------------
describe('passwordPolicyErrors', () => {
    const strictSettings = {
        minPasswordLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSymbol: true,
    };

    it('returns no errors for a valid password', () => {
        expect(passwordPolicyErrors('Passw0rd!', strictSettings)).toHaveLength(0);
    });

    it('requires the password to be present', () => {
        const errors = passwordPolicyErrors(null, strictSettings);
        expect(errors).toContain('Password is required');
    });

    it('requires minimum length', () => {
        const errors = passwordPolicyErrors('Ab1!', strictSettings);
        expect(errors.some((e) => e.includes('at least 8 characters'))).toBe(true);
    });

    it('requires uppercase when enabled', () => {
        const errors = passwordPolicyErrors('passw0rd!', strictSettings);
        expect(errors.some((e) => e.includes('uppercase'))).toBe(true);
    });

    it('requires a number when enabled', () => {
        const errors = passwordPolicyErrors('Password!', strictSettings);
        expect(errors.some((e) => e.includes('number'))).toBe(true);
    });

    it('requires a symbol when enabled', () => {
        const errors = passwordPolicyErrors('Password1', strictSettings);
        expect(errors.some((e) => e.includes('special character'))).toBe(true);
    });

    it('accumulates multiple errors at once', () => {
        const errors = passwordPolicyErrors('short', strictSettings);
        expect(errors.length).toBeGreaterThan(1);
    });

    it('skips checks that are disabled', () => {
        const lenientSettings = {
            minPasswordLength: 4,
            requireUppercase: false,
            requireNumber: false,
            requireSymbol: false,
        };
        expect(passwordPolicyErrors('aaaa', lenientSettings)).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// matchesAllowlist
// ---------------------------------------------------------------------------
describe('matchesAllowlist', () => {
    it('returns true when allowlist is empty (no restriction)', () => {
        expect(matchesAllowlist(IP.SAMPLE_IPV4_A, [])).toBe(true);
        expect(matchesAllowlist(IP.SAMPLE_IPV4_A, null)).toBe(true);
    });

    it('matches an exact IPv4 entry', () => {
        expect(matchesAllowlist(IP.SAMPLE_IPV4_B, [IP.SAMPLE_IPV4_B])).toBe(true);
    });

    it('rejects an IP not in the allowlist', () => {
        expect(matchesAllowlist(IP.SAMPLE_IPV4_C, [IP.SAMPLE_IPV4_B])).toBe(false);
    });

    it('matches an IP inside a CIDR range', () => {
        expect(matchesAllowlist(IP.SAMPLE_IPV4_D, [IP.SAMPLE_IPV4_CIDR_24])).toBe(true);
    });

    it('rejects an IP outside a CIDR range', () => {
        expect(matchesAllowlist(IP.SAMPLE_IPV4_OUTSIDE, [IP.SAMPLE_IPV4_CIDR_24])).toBe(false);
    });

    it('normalizes IPv6 loopback to loopback constant before matching', () => {
        expect(matchesAllowlist(LOOPBACK_V6, [LOOPBACK_IP])).toBe(true);
    });

    it('returns false for an invalid IP string', () => {
        expect(matchesAllowlist('not-an-ip', [IP.SAMPLE_IPV4_CIDR_8])).toBe(false);
    });

    it('accepts multiple entries, matches any', () => {
        const list = [IP.SAMPLE_IPV4_CIDR_192_168_2, IP.SAMPLE_IPV4_C];
        expect(matchesAllowlist(IP.SAMPLE_IPV4_IN_RANGE_192_168_2_5, list)).toBe(true);
        expect(matchesAllowlist(IP.SAMPLE_IPV4_C, list)).toBe(true);
        expect(matchesAllowlist(IP.SAMPLE_IPV4_172_16_0_1, list)).toBe(false);
    });

    it('skips blank/whitespace entries gracefully', () => {
        expect(matchesAllowlist(IP.SAMPLE_IPV4_C, ['', '  ', IP.SAMPLE_IPV4_C])).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// mergeNotificationPreferences
// ---------------------------------------------------------------------------
describe('mergeNotificationPreferences', () => {
    it('returns the defaults when called with null', () => {
        const result = mergeNotificationPreferences(null);
        expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('overrides defaults with provided values', () => {
        const custom = { newLoginEmail: false };
        const result = mergeNotificationPreferences(custom);
        expect(result.newLoginEmail).toBe(false);
        // Other defaults remain intact
        expect(result.newLoginInApp).toBe(true);
    });

    it('fills in missing keys from defaults', () => {
        const result = mergeNotificationPreferences({ policyChangedEmail: false });
        const keys = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES);
        keys.forEach((k) => expect(result).toHaveProperty(k));
    });
});

// ---------------------------------------------------------------------------
// ALLOWED_LANGUAGES constant
// ---------------------------------------------------------------------------
describe('ALLOWED_LANGUAGES', () => {
    it('includes English', () => {
        expect(ALLOWED_LANGUAGES).toContain('en');
    });

    it('is an array of strings', () => {
        expect(Array.isArray(ALLOWED_LANGUAGES)).toBe(true);
        ALLOWED_LANGUAGES.forEach((l) => expect(typeof l).toBe('string'));
    });
});
