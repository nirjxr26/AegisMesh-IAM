'use strict';

const { AppError, ErrorCodes, createError } = require('../../src/utils/errors');

describe('AppError', () => {
    it('creates an error with all properties', () => {
        const err = new AppError('Something broke', 500, 'INTERNAL', { detail: 'x' });
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(AppError);
        expect(err.message).toBe('Something broke');
        expect(err.statusCode).toBe(500);
        expect(err.errorCode).toBe('INTERNAL');
        expect(err.details).toEqual({ detail: 'x' });
        expect(err.isOperational).toBe(true);
    });

    it('defaults details to null when omitted', () => {
        const err = new AppError('Msg', 400, 'CODE');
        expect(err.details).toBeNull();
    });

    it('has a stack trace', () => {
        const err = new AppError('Oops', 500, 'ERR');
        expect(typeof err.stack).toBe('string');
        expect(err.stack.length).toBeGreaterThan(0);
    });
});

describe('ErrorCodes', () => {
    const required = [
        'AUTH_001', 'AUTH_002', 'AUTH_003', 'AUTH_004', 'AUTH_005',
        'AUTH_006', 'AUTH_007', 'AUTH_008', 'AUTH_009', 'AUTH_010',
        'RBAC_001', 'RBAC_002', 'RBAC_003', 'RBAC_004', 'RBAC_005',
        'RBAC_006', 'RBAC_007',
        'USER_001', 'USER_002', 'USER_003', 'USER_004', 'USER_005',
        'USER_006', 'USER_007', 'USER_008',
    ];

    it.each(required)('defines code %s with code, message, and status', (key) => {
        const entry = ErrorCodes[key];
        expect(entry).toBeDefined();
        expect(typeof entry.code).toBe('string');
        expect(typeof entry.message).toBe('string');
        expect(typeof entry.status).toBe('number');
    });
});

describe('createError', () => {
    it('creates an AppError for a known code', () => {
        const err = createError('AUTH_001');
        expect(err).toBeInstanceOf(AppError);
        expect(err.errorCode).toBe('AUTH_001');
        expect(err.message).toBe('Invalid credentials');
        expect(err.statusCode).toBe(401);
        expect(err.details).toBeNull();
    });

    it('attaches details when provided', () => {
        const details = { field: 'email' };
        const err = createError('AUTH_009', details);
        expect(err.details).toEqual(details);
    });

    it('returns a 500 AppError for unknown error codes', () => {
        const err = createError('DOES_NOT_EXIST');
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(500);
        expect(err.errorCode).toBe('UNKNOWN');
    });

    it('returns a 500 AppError for null input', () => {
        const err = createError(null);
        expect(err.statusCode).toBe(500);
    });

    it('maps every defined ErrorCode correctly', () => {
        Object.keys(ErrorCodes).forEach((key) => {
            const err = createError(key);
            expect(err.errorCode).toBe(ErrorCodes[key].code);
            expect(err.statusCode).toBe(ErrorCodes[key].status);
        });
    });
});
