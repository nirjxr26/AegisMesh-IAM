const bcrypt = require('bcryptjs');
const prisma = require('../../src/config/database');

/* Seed-only password — loaded from env or uses demo fallback, never a real credential */
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'Seed-Demo-Pass-2024-Dev'; // NOSONAR — dev-only fallback

const { roleSeeds } = require('./data');
const { users, sessions, seedUsers, seedSessions } = require('./users');
const { policies, groups, rolePolicyRows, userGroupRows, groupRoleRows, seedRoles } = require('./roles');
const { seedOrganization } = require('./organizations');
const { auditLogs, seedAuditLogs } = require('./audit');

async function seedDatabase() {
    console.log('Starting production-style IAM seed...');

    await seedOrganization();

    const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 12);

    await prisma.rolePolicy.deleteMany();
    await prisma.groupRole.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.userGroup.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.oAuthAccount.deleteMany();
    await prisma.policy.deleteMany();
    await prisma.group.deleteMany();
    await prisma.role.deleteMany();
    await prisma.user.deleteMany();

    await seedRoles(prisma);
    await seedUsers(prisma, passwordHash);
    await seedSessions(prisma);
    const { alertLogs, dailyLogs } = await seedAuditLogs(prisma);

    const userRoleCount = users.filter((u) => u.roleId).length;

    const summary = {
        users: users.length,
        roles: roleSeeds.length,
        policies: policies.length,
        groups: groups.length,
        auditLogs: auditLogs.length + alertLogs.length + dailyLogs.length,
        sessions: sessions.length,
        userRoles: userRoleCount,
        rolePolicies: rolePolicyRows.length,
        userGroups: userGroupRows.length,
        groupRoles: groupRoleRows.length,
    };

    console.log('Production seed completed successfully.');
    console.table(summary);
}

async function main() {
    try {
        await seedDatabase();
    } catch (error) {
        console.error('Seed failed:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    users,
    roles: roleSeeds,
    policies,
    groups,
    auditLogs,
    sessions,
    default: { users, roles: roleSeeds, policies, groups, auditLogs, sessions },
    seedDatabase,
};
