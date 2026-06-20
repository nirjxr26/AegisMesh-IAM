const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis;

if (process.env.NODE_ENV === 'test') {
    // Create an in-memory mock client for Jest testing to avoid connections
    redis = {
        status: 'ready',
        get: async (key) => null,
        set: async (key, val) => 'OK',
        setex: async (key, seconds, val) => 'OK',
        del: async (key) => 1,
        exists: async (key) => 0,
        incr: async (key) => 1,
        on: (event, handler) => {},
        quit: async () => 'OK',
    };
    logger.info('Using mock Redis client for testing');
} else {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
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
