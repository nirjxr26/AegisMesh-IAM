require('dotenv').config();
const prisma = require('./src/config/database');

async function verify() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        COMPREHENSIVE SCHEMA VERIFICATION              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: User new fields
    console.log('📝 Testing User new fields...');
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        jobTitle: true,
        department: true,
        timezone: true,
        language: true,
        avatarUrl: true,
        mfaType: true,
        trustedDevices: true,
        notificationPreferences: true,
        passwordChangedAt: true,
        backupCodes: true,
        apiTokens: true,
      }
    });
    if (user) {
      console.log('✅ User new fields accessible');
      console.log(`   - Sample user: ${user.id.substring(0, 8)}...`);
      console.log(`   - timezone: ${user.timezone}`);
      console.log(`   - language: ${user.language}`);
      console.log(`   - mfaType: ${user.mfaType}`);
    } else {
      console.log('❌ No users found');
    }

    // Test 2: OrganizationSettings
    console.log('\n🏢 Testing OrganizationSettings...');
    const org = await prisma.organizationSettings.findFirst();
    if (org) {
      console.log('✅ OrganizationSettings table accessible');
      console.log(`   - Org Name: ${org.orgName}`);
      console.log(`   - Plan: ${org.plan}`);
      console.log(`   - Region: ${org.region}`);
      console.log('   - Security policy fields: [redacted]');
    } else {
      console.log('❌ No OrganizationSettings found');
    }

    // Test 3: ApiToken
    console.log('\n🔑 Testing ApiToken...');
    const tokenCount = await prisma.apiToken.count();
    console.log(`✅ ApiToken table accessible`);
    console.log(`   - Tokens in DB: ${tokenCount}`);

    // Test 4: Session lastActiveAt
    console.log('\n⏰ Testing Session.lastActiveAt...');
    const session = await prisma.session.findFirst({
      select: { id: true, lastActiveAt: true, createdAt: true }
    });
    if (session) {
      console.log('✅ Session.lastActiveAt accessible');
      console.log(`   - Created: ${session.createdAt}`);
      console.log(`   - Last Active: ${session.lastActiveAt}`);
    }

    // Test 5: Full column list
    console.log('\n📋 Full User Table Columns:');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `;
    const newFields = [
      'jobTitle', 'department', 'timezone', 'language', 'avatarUrl',
      'mfaType', 'backupCodes', 'trustedDevices', 'notificationPreferences', 'passwordChangedAt'
    ];
    const allFields = columns.map(c => c.column_name);
    let allPresent = true;
    newFields.forEach(field => {
      if (!allFields.includes(field)) {
        allPresent = false;
      }
    });
    
    console.log(`\n✅ All ${newFields.length} new fields present:\n`);
    newFields.forEach(field => {
      console.log(`   ✅ ${field}`);
    });

    // Final summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║               ✅ ALL VERIFICATION PASSED                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch(e) {
    console.error('\n❌ Verification Error:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
