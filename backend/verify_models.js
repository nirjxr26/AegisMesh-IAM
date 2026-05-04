const prisma = require('./src/config/database');

async function verify() {
  try {
    console.log('\n=== Prisma Models Available ===\n');
    const models = Object.keys(prisma).filter(k => 
      !k.startsWith('_') && 
      !k.startsWith('$') &&
      k !== 'constructor'
    ).sort();
    
    models.forEach((m, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${m}`);
    });
    console.log('\nTotal models:', models.length);

    // Test each critical model
    console.log('\n=== Testing Models ===\n');
    
    const userCount = await prisma.user.count();
    console.log(`✅ User model works (${userCount} users exist)`);
    
    const orgCount = await prisma.organizationSettings.count();
    console.log(`✅ OrganizationSettings model works (${orgCount} records exist)`);
    
    const tokenCount = await prisma.apiToken.count();
    console.log(`✅ ApiToken model works (${tokenCount} tokens exist)`);

    // Check org settings data
    if (orgCount > 0) {
      const org = await prisma.organizationSettings.findFirst();
      console.log(`\n📋 Default Org Settings:`);
      console.log(`   Name: ${org.orgName}`);
      console.log(`   Plan: ${org.plan}`);
      console.log(`   Region: ${org.region}`);
    }

  } catch(e) {
    console.error('❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
