class AppError extends Error {
    constructor(message, statusCode, errorCode, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const ErrorCodes = {
    AUTH_001: { code: 'AUTH_001', message: 'Invalid credentials', status: 401 },
    AUTH_002: { code: 'AUTH_002', message: 'Account locked', status: 423 },
    AUTH_003: { code: 'AUTH_003', message: 'Email not verified', status: 403 },
    AUTH_004: { code: 'AUTH_004', message: 'MFA code required', status: 403 },
    AUTH_005: { code: 'AUTH_005', message: 'Invalid MFA code', status: 401 },
    AUTH_006: { code: 'AUTH_006', message: 'Token expired', status: 401 },
    AUTH_007: { code: 'AUTH_007', message: 'Token invalid', status: 401 },
    AUTH_008: { code: 'AUTH_008', message: 'Account inactive', status: 403 },
    AUTH_009: { code: 'AUTH_009', message: 'Email already registered', status: 409 },
    AUTH_010: { code: 'AUTH_010', message: 'Invalid reset token', status: 400 },
    RBAC_001: { code: 'RBAC_001', message: 'Access denied', status: 403 },
    RBAC_002: { code: 'RBAC_002', message: 'Role not found', status: 404 },
    RBAC_003: { code: 'RBAC_003', message: 'Policy not found', status: 404 },
    RBAC_004: { code: 'RBAC_004', message: 'Group not found', status: 404 },
    RBAC_005: { code: 'RBAC_005', message: 'Cannot modify system role/policy', status: 403 },
    RBAC_006: { code: 'RBAC_006', message: 'Role already assigned', status: 400 },
    RBAC_007: { code: 'RBAC_007', message: 'User already in group', status: 400 },
    USER_001: { code: 'USER_001', message: 'User not found', status: 404 },
    USER_002: { code: 'USER_002', message: 'Cannot delete own account', status: 400 },
    USER_003: { code: 'USER_003', message: 'Cannot lock last SuperAdmin', status: 400 },
    USER_004: { code: 'USER_004', message: 'Cannot delete last SuperAdmin', status: 400 },
    USER_005: { code: 'USER_005', message: 'Email already verified', status: 400 },
    USER_006: { code: 'USER_006', message: 'Email already in use', status: 409 },
    USER_007: { code: 'USER_007', message: 'Invalid status value', status: 400 },
    USER_008: { code: 'USER_008', message: 'Cannot change own status', status: 400 },
    VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Validation failed', status: 400 },
};

function createError(errorCode, details = null) {
    const err = ErrorCodes[errorCode];
    if (!err) {
        return new AppError('Unknown error', 500, 'UNKNOWN');
    }
    
    // Support message override if provided in details
    const message = (details && typeof details === 'object' && details.message) 
        ? details.message 
        : err.message;
        
    return new AppError(message, err.status, err.code, details);
}

module.exports = { AppError, ErrorCodes, createError };
