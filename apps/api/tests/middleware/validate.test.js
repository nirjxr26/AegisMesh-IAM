'use strict';

jest.mock('../../src/utils/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

const Joi = require('joi');
const { validate } = require('../../src/middleware/validate');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSchema(bodyShape = null, paramsShape = null, queryShape = null) {
    const schema = {};
    if (bodyShape) schema.body = Joi.object(bodyShape);
    if (paramsShape) schema.params = Joi.object(paramsShape);
    if (queryShape) schema.query = Joi.object(queryShape);
    return schema;
}

function makeReq({ body = {}, params = {}, query = {} } = {}) {
    return { body, params, query };
}

function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

// ---------------------------------------------------------------------------
// Body validation
// ---------------------------------------------------------------------------
describe('validate – body', () => {
    const schema = buildSchema({ name: Joi.string().required(), age: Joi.number().integer().min(0) });

    it('calls next when body is valid', () => {
        const req = makeReq({ body: { name: 'Alice', age: 30 } });
        const next = jest.fn();

        validate(schema)(req, makeRes(), next);

        expect(next).toHaveBeenCalledWith(/* no args = success */);
    });

    it('strips unknown fields from the body', () => {
        const req = makeReq({ body: { name: 'Bob', age: 25, extra: 'drop-me' } });
        const next = jest.fn();

        validate(schema)(req, makeRes(), next);

        expect(req.body).not.toHaveProperty('extra');
    });

    it('returns 400 when a required field is missing', () => {
        const req = makeReq({ body: { age: 20 } });
        const res = makeRes();
        const next = jest.fn();

        validate(schema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(Array.isArray(body.error.details)).toBe(true);
        expect(body.error.details.length).toBeGreaterThan(0);
    });

    it('collects multiple errors at once', () => {
        const req = makeReq({ body: { age: -1 } }); // missing name, invalid age
        const res = makeRes();

        validate(schema)(req, res, jest.fn());

        const body = res.json.mock.calls[0][0];
        expect(body.error.details.length).toBeGreaterThanOrEqual(2);
    });

    it('replaces double quotes in error messages', () => {
        const req = makeReq({ body: {} });
        const res = makeRes();

        validate(schema)(req, res, jest.fn());

        const messages = res.json.mock.calls[0][0].error.details.map((d) => d.message);
        messages.forEach((msg) => expect(msg).not.toContain('"'));
    });
});

// ---------------------------------------------------------------------------
// Params validation
// ---------------------------------------------------------------------------
describe('validate – params', () => {
    const schema = buildSchema(null, { id: Joi.string().uuid().required() });

    it('calls next for a valid UUID param', () => {
        const req = makeReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
        const next = jest.fn();

        validate(schema)(req, makeRes(), next);

        expect(next).toHaveBeenCalled();
    });

    it('returns 400 for an invalid UUID param', () => {
        const req = makeReq({ params: { id: 'not-a-uuid' } });
        const res = makeRes();

        validate(schema)(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        const body = res.json.mock.calls[0][0];
        expect(body.error.details[0].field).toBe('id');
    });
});

// ---------------------------------------------------------------------------
// Query validation
// ---------------------------------------------------------------------------
describe('validate – query', () => {
    const schema = buildSchema(null, null, {
        page: Joi.number().integer().min(1).default(1),
    });

    it('calls next when query is valid', () => {
        const req = makeReq({ query: { page: '2' } });
        const next = jest.fn();

        validate(schema)(req, makeRes(), next);

        expect(next).toHaveBeenCalled();
        expect(req.query.page).toBe(2); // coerced to number
    });

    it('returns 400 for an invalid query value', () => {
        const req = makeReq({ query: { page: '0' } }); // min 1
        const res = makeRes();

        validate(schema)(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);
    });
});

// ---------------------------------------------------------------------------
// No schema sections
// ---------------------------------------------------------------------------
describe('validate – empty schema', () => {
    it('always calls next when no sections are defined', () => {
        const req = makeReq({ body: { anything: true } });
        const next = jest.fn();

        validate({})(req, makeRes(), next);

        expect(next).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Combined body + params + query
// ---------------------------------------------------------------------------
describe('validate – combined schema', () => {
    const schema = buildSchema(
        { title: Joi.string().required() },
        { id: Joi.string().uuid().required() },
        { verbose: Joi.boolean().default(false) }
    );

    it('calls next when all sections are valid', () => {
        const req = makeReq({
            body: { title: 'Hello' },
            params: { id: '550e8400-e29b-41d4-a716-446655440000' },
            query: { verbose: 'true' },
        });
        const next = jest.fn();

        validate(schema)(req, makeRes(), next);

        expect(next).toHaveBeenCalled();
    });

    it('accumulates errors from multiple sections', () => {
        const req = makeReq({
            body: {},            // missing title
            params: { id: 'bad' }, // invalid uuid
            query: {},
        });
        const res = makeRes();

        validate(schema)(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        const body = res.json.mock.calls[0][0];
        expect(body.error.details.length).toBeGreaterThanOrEqual(2);
    });
});
