const prisma = require('./src/config/database');
async function main() {
    console.log('Fetching audit logs counts...');
    const logs = await prisma.auditLog.groupBy({
        by: ['action'],
        _count: { _all: true },
        where: {
            action: {
                in: ['USER_CREATED', 'USER_STATUS_CHANGED', 'EMAIL_MANUALLY_VERIFIED', 'USER_DELETED', 'ALL_SESSIONS_REVOKED']
            }
        }
    });
    console.log(JSON.stringify(logs, null, 2));
}
main().finally(() => prisma.$disconnect());
