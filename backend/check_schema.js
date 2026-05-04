require('dotenv').config();
const prisma = require('./src/config/database');

async function checkSchema() {
  try {
    console.log('\n=== User Table Columns ===\n');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `;
    columns.forEach(col => {
      console.log(`${col.column_name.padEnd(35)} | ${col.data_type}`);
    });

    console.log('\n=== All Tables ===\n');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    tables.forEach(tbl => {
      console.log(`  ${tbl.table_name}`);
    });

    // Check for specific new fields
    console.log('\n=== Checking for NEW FIELDS ===\n');
    const newFields = [
      'jobTitle', 'department', 'timezone', 'language', 'avatarUrl',
      'mfaType', 'backupCodes', 'trustedDevices', 'notificationPreferences', 'passwordChangedAt'
    ];
    const existingFields = columns.map(c => c.column_name);
    
    newFields.forEach(field => {
      const exists = existingFields.includes(field);
      console.log(`${exists ? '✅' : '❌'} ${field.padEnd(30)}`);
    });

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
