const prisma = require('../../src/config/database');

async function verify() {
    try {
        console.log('\n=== Prisma Models Available ===\n');
        const models = Object.keys(prisma).filter((key) =>
            !key.startsWith('_') &&
            !key.startsWith('$') &&
            key !== 'constructor'
        ).sort();

        models.forEach((model, index) => {
            console.log(`  ${(index + 1).toString().padStart(2)}. ${model}`);
        });
        console.log('\nTotal models:', models.length);

        console.log('\n=== Testing Models ===\n');

        const userCount = await prisma.user.count();
        console.log(`✅ User model works (${userCount} users exist)`);

        const orgCount = await prisma.organizationSettings.count();
        console.log(`✅ OrganizationSettings model works (${orgCount} records exist)`);

        const tokenCount = await prisma.apiToken.count();
        console.log(`✅ ApiToken model works (${tokenCount} tokens exist)`);

        if (orgCount > 0) {
            const org = await prisma.organizationSettings.findFirst();
            console.log(`\n📋 Default Org Settings:`);
            console.log(`   Name: ${org.orgName}`);
            console.log(`   Plan: ${org.plan}`);
            console.log(`   Region: ${org.region}`);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();