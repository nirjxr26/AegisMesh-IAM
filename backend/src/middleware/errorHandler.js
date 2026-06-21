const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, _next) {
    // Log the error
    logger.error('Error caught by handler', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

    let status = err.statusCode || 500;
    let body = {
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
        },
    };

    // Prisma connection / credential / authentication errors
    const errMsgLower = err.message ? String(err.message).toLowerCase() : '';
    const isPrismaDbConnError = 
        err.code?.startsWith('P1') || 
        errMsgLower.includes('authentication failed against database server') ||
        errMsgLower.includes('database credentials') ||
        errMsgLower.includes('can\'t reach database server') ||
        errMsgLower.includes('cannot connect to the database') ||
        (errMsgLower.includes('prisma') && (
            errMsgLower.includes('connection') || 
            errMsgLower.includes('credential') || 
            errMsgLower.includes('authentication') || 
            errMsgLower.includes('failed')
        ));

    if (err.isOperational) {
        status = err.statusCode;
        body.error = { 
            code: err.errorCode, 
            message: err.message, 
            details: err.details || undefined 
        };
    } else if (isPrismaDbConnError) {
        status = 503;
        body.error = { 
            code: 'DATABASE_ERROR', 
            message: 'Database connection or authentication failed. Please verify credentials and database availability.' 
        };
    } else if (err.code === 'P2002') {
        status = 409;
        body.error = { code: 'CONFLICT', message: 'A record with this data already exists', details: err.meta };
    } else if (err.code === 'P2025') {
        status = 404;
        body.error = { code: 'NOT_FOUND', message: 'Record not found' };
    } else if (err.name === 'JsonWebTokenError') {
        status = 401;
        body.error = { code: 'AUTH_007', message: 'Token invalid' };
    } else if (err.name === 'TokenExpiredError') {
        status = 401;
        body.error = { code: 'AUTH_006', message: 'Token expired' };
    } else if (err.code === 'EBADCSRFTOKEN') {
        status = 403;
        body.error = { code: 'CSRF_ERROR', message: 'Invalid or missing CSRF token' };
    }

    return res.status(status).json(body);
}

/**
 * 404 handler for unknown routes
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
}

module.exports = { errorHandler, notFoundHandler };
