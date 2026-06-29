const prisma = require('../../src/config/database');
const { uuidv4 } = require('./data');

async function seedOrganization() {
    const existingOrg = await prisma.organizationSettings.findFirst();
    if (existingOrg) {
        console.log('ℹ️  OrganizationSettings exists, skipping creation');
        return;
    }

    await prisma.organizationSettings.create({
        data: {
            orgName: 'Northbridge IAM',
            accountId: uuidv4(),
            plan: 'enterprise',
            region: 'us-east-1',
            minPasswordLength: 12,
            requireUppercase: true,
            requireNumber: true,
            requireSymbol: true,
            passwordExpiryDays: 90,
            maxFailedAttempts: 5,
            sessionTimeoutMinutes: 480,
            requireMfaForAll: false,
            allowOAuthLogin: true,
            ipAllowlist: [],
        },
    });

    console.log('✅ OrganizationSettings created');
}

module.exports = { seedOrganization };
