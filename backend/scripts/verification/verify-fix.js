const prisma = require('../../src/config/database');
const { getStats } = require('../../src/controllers/auditLog.controller');

async function verify() {
    const result = await prisma.user.count();
    console.log('Direct DB Check - Total Users:', result);

    const res = {
        json: (data) => console.log('Controller Response Data:', JSON.stringify(data, null, 2)),
    };
    const next = (error) => console.error('Error in controller:', error);

    await getStats({}, res, next);
}

verify().catch(console.error).finally(() => prisma.$disconnect());