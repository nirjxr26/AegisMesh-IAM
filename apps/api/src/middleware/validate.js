const logger = require('../utils/logger');

/**
 * Joi validation middleware factory
 * @param {Object} schema - Joi schema object with optional body, params, query keys
 */
function validate(schema) {
    return (req, res, next) => {
        const errors = [];

        if (schema.body) {
            const { error, value } = schema.body.validate(req.body, {
                abortEarly: false,
                stripUnknown: true,
            });
            if (error) {
                errors.push(
                    ...error.details.map((d) => ({
                        field: d.path.join('.'),
                        message: d.message.replaceAll('"', ''),
                    }))
                );
            } else {
                req.body = value;
            }
        }

        if (schema.params) {
            const { error, value } = schema.params.validate(req.params, {
                abortEarly: false,
                stripUnknown: true,
            });
            if (error) {
                errors.push(
                    ...error.details.map((d) => ({
                        field: d.path.join('.'),
                        message: d.message.replaceAll('"', ''),
                    }))
                );
            } else {
                req.params = value;
            }
        }

        if (schema.query) {
            const { error, value } = schema.query.validate(req.query, {
                abortEarly: false,
                stripUnknown: true,
            });
            if (error) {
                errors.push(
                    ...error.details.map((d) => ({
                        field: d.path.join('.'),
                        message: d.message.replaceAll('"', ''),
                    }))
                );
            } else {
                req.query = value;
            }
        }

        if (errors.length > 0) {
            logger.debug('Validation failed', { errors });
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: errors,
                },
            });
        }

        next();
    };
}

module.exports = { validate };
