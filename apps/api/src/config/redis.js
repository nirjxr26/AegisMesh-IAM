const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis;

if (process.env.NODE_ENV === 'test') {
    // Create an in-memory mock client for Jest testing to avoid connections
    redis = {
        status: 'ready',
        get: async (_key) => null,
        set: async (_key, _val) => 'OK',
        setex: async (_key, _seconds, _val) => 'OK',
        del: async (_key) => 1,
        exists: async (_key) => 0,
        incr: async (_key) => 1,
        on: (_event, _handler) => {},
        quit: async () => 'OK',
    };
    logger.info('Using mock Redis client for testing');
} else {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number.parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    redis = new Redis({
        host,
        port,
        password,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            // Reconnect retry strategy - increases delay up to 2 seconds
            const delay = Math.min(times * 100, 2000);
            return delay;
        }
    });

    redis.on('connect', () => {
        logger.info(`Connecting to Redis server at ${host}:${port}...`);
    });

    redis.on('ready', () => {
        logger.info('Redis client connected and ready.');
    });

    redis.on('error', (err) => {
        logger.error('Redis connection error', { error: err.message });
    });
}

module.exports = redis;
