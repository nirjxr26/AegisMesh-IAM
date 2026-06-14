require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { observeDatabaseQuery } = require('../utils/metrics');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to initialize Prisma');
}

// Reuse a global instance in non-production to avoid multiple clients during reloads/tests
const globalForPrisma = globalThis;

const basePrisma = globalForPrisma.prisma || new PrismaClient({
    log: [{ emit: 'event', level: 'error' }],
});

basePrisma.$on('error', (e) => {
    logger.error('Prisma error', { message: e.message });
});

const prisma = globalForPrisma.prismaExtended || basePrisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const startedAt = process.hrtime.bigint();

                try {
                    return await query(args);
                } finally {
                    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
                    observeDatabaseQuery(model, operation, durationSeconds);
                }
            },
        },
        $rawQuery: {
            async $allOperations({ operation, args, query }) {
                const startedAt = process.hrtime.bigint();

                try {
                    return await query(args);
                } finally {
                    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
                    observeDatabaseQuery('raw', operation, durationSeconds);
                }
            },
        },
    },
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = basePrisma;
    globalForPrisma.prismaExtended = prisma;
}

module.exports = prisma;
