const winston = require('winston');
const path = require('node:path');

const SENSITIVE_KEYS = [
  'refreshtoken', 'accesstoken', 'password', 'passwordhash', 'secret',
  'token', 'otp', 'mfatoken', 'auth', 'credentials', 'pwd', 'api_key', 'apikey'
];

function sanitizeValue(value) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    let sanitized = value;
    for (const key of SENSITIVE_KEYS) {
      const regex = new RegExp(`(decodeURIComponent\\()?("${key}"|'${key}'|\\\\"${key}\\\\"|\\b${key}\\b)\\s*[:=]\\s*(?:"[^"]*"|'[^']*'|\\\\"[^\\\\"]*\\\\"|\\b[a-zA-Z0-9_\\/\\+\\=\\-\\.\\*]+\\b)`, 'gi');
      sanitized = sanitized.replace(regex, (match, p1, p2) => {
        return p1 ? `${p1}${p2}: "[REDACTED]"` : `${p2}: "[REDACTED]"`;
      });
    }
    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object') {
    if (value instanceof Error) {
      // Re-create the error object or modify message & stack safely
      value.message = sanitizeValue(value.message);
      if (value.stack) {
        value.stack = sanitizeValue(value.stack);
      }
      return value;
    }
    const sanitizedObj = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
        sanitizedObj[k] = '[REDACTED]';
      } else {
        sanitizedObj[k] = sanitizeValue(v);
      }
    }
    return sanitizedObj;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return sanitizeValue(String(value));
  }

  return value;
}

const sanitizeFormat = winston.format((info) => {
  if (info.message) {
    info.message = sanitizeValue(info.message);
  }
  if (info.stack) {
    info.stack = sanitizeValue(info.stack);
  }
  for (const key of Object.keys(info)) {
    if (!['timestamp', 'level', 'message', 'stack'].includes(key)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        info[key] = '[REDACTED]';
      } else {
        info[key] = sanitizeValue(info[key]);
      }
    }
  }
  return info;
});

const logFormat = winston.format.combine(
  sanitizeFormat(),

  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),

  winston.format.errors({ stack: true }),

  winston.format.printf((info) => {
    const {
      timestamp,
      level,
      message,
      stack,
      ...meta
    } = info;

    let log = `${String(timestamp)} [${String(level).toUpperCase()}]: ${typeof message === 'object'
      ? JSON.stringify(message)
      : String(message)
    }`;

    if (stack) {
      log += `\n${typeof stack === 'object'
        ? JSON.stringify(stack, null, 2)
        : String(stack)
      }`;
    }

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'iam-auth' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

module.exports = logger;
