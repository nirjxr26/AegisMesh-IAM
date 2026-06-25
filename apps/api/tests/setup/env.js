/**
 * Jest test environment setup — runs before any test module is loaded.
 * Provides the minimum required env vars so middlewares that read
 * process.env at import time (e.g. CSRF secret, JWT secrets) do not
 * throw during test collection.
 *
 * Real secrets are not needed here because all external services
 * (Prisma, token signing, email, etc.) are mocked in test suites.
 */
process.env.NODE_ENV            = process.env.NODE_ENV            || 'test';
process.env.JWT_SECRET          = process.env.JWT_SECRET          || 'test-jwt-secret-for-ci-only';
process.env.JWT_ACCESS_SECRET   = process.env.JWT_ACCESS_SECRET   || 'test-access-secret-for-ci-only';
process.env.JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET  || 'test-refresh-secret-for-ci-only';
process.env.JWT_REAUTH_SECRET   = process.env.JWT_REAUTH_SECRET   || 'test-reauth-secret-for-ci-only';
process.env.ENCRYPTION_KEY      = process.env.ENCRYPTION_KEY      || '0000000000000000000000000000000000000000000000000000000000000001';
process.env.FRONTEND_URL        = process.env.FRONTEND_URL        || 'http://localhost:3000';
process.env.DATABASE_URL        = process.env.DATABASE_URL        || 'postgresql://test:test@localhost:5432/test';
