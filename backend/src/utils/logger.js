const winston = require('winston');
const path = require('node:path');

const logFormat = winston.format.combine(
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
