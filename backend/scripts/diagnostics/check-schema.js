require('dotenv').config();
const prisma = require('../../src/config/database');

async function checkSchema() {
    try {
        console.log('\n=== User Table Columns ===\n');
        const columns = await prisma.$queryRaw`
      SELECT CAST(column_name AS TEXT) as column_name, CAST(data_type AS TEXT) as data_type
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `;
        columns.forEach((col) => {
            console.log(`${col.column_name.padEnd(35)} | ${col.data_type}`);
        });

        console.log('\n=== All Tables ===\n');
        const tables = await prisma.$queryRaw`
      SELECT CAST(table_name AS TEXT) as table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
        tables.forEach((tbl) => {
            console.log(`  ${tbl.table_name}`);
        });

        console.log('\n=== Group Table Columns ===\n');
        const groupCols = await prisma.$queryRaw`
      SELECT CAST(column_name AS TEXT) as column_name, CAST(data_type AS TEXT) as data_type
      FROM information_schema.columns
      WHERE table_name = 'Group'
      ORDER BY ordinal_position
    `;
        groupCols.forEach((col) => {
            console.log(`${col.column_name.padEnd(35)} | ${col.data_type}`);
        });

        console.log('\n=== Checking for NEW FIELDS ===\n');
        const newFields = [
            'jobTitle', 'department', 'timezone', 'language', 'avatarUrl',
            'mfaType', 'backupCodes', 'trustedDevices', 'notificationPreferences', 'passwordChangedAt',
        ];
        const existingFields = new Set(columns.map((c) => c.column_name));

        newFields.forEach((field) => {
            const exists = existingFields.has(field);
            console.log(`${exists ? '✅' : '❌'} ${field.padEnd(30)}`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();