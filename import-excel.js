const XLSX = require('xlsx');
const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config();

const databaseUrl = 
  process.env.DATABASE_URL || 
  process.env.DB_URL || 
  process.env.POSTGRES_URL || 
  process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
  console.error('❌ Database connection string missing in .env!');
  process.exit(1);
}

// Initialize Sequelize directly with PostgreSQL and Supabase SSL options
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

// Helper to get a value from a row regardless of casing, capitalization, or extra spaces
function getField(row, possibleKeys) {
  const rowKeys = Object.keys(row);
  for (const key of possibleKeys) {
    const foundKey = rowKeys.find(k => k.trim().toLowerCase() === key.toLowerCase());
    if (foundKey !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
      return row[foundKey];
    }
  }
  return null;
}

async function importMembers() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to Supabase PostgreSQL successfully!\n');

    // Load the Excel workbook
    const workbook = XLSX.readFile('members.xlsx'); 
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const members = XLSX.utils.sheet_to_json(sheet);
    console.log(`📊 Total rows found in Excel: ${members.length}\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < members.length; i++) {
      const row = members[i];

      // Field extraction using case-insensitive key matching
      const membershipNumber = getField(row, ['membership number', 'membershipnumber', 'id', 'sn', 's/n']);
      let email = getField(row, ['e-mail address', 'email', 'e-mail', 'email address']);

      // 1. Ensure membershipnumber exists
      const cleanMembershipNumber = membershipNumber 
        ? String(membershipNumber).trim() 
        : `NAUS-MEMBER-${i + 1}`;

      // 2. Handle missing emails
      if (!email) {
        const sanitizedId = cleanMembershipNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
        email = `noemail_${sanitizedId}@nausurology.org`;
        console.warn(`⚠️ Row ${i + 1} missing email. Auto-assigning fallback: ${email}`);
      } else {
        email = String(email).trim().toLowerCase();
      }

      try {
        await sequelize.query(
          `INSERT INTO members (membershipnumber, email) 
           VALUES (:membershipNumber, :email)
           ON CONFLICT (membershipnumber) 
           DO UPDATE SET 
             email = EXCLUDED.email;`,
          {
            replacements: { 
              membershipNumber: cleanMembershipNumber, 
              email: email
            },
            type: QueryTypes.INSERT
          }
        );
        successCount++;
      } catch (dbError) {
        console.error(`❌ DB error for row ${i + 1} (${email}):`, dbError.message);
        failCount++;
      }
    }

    console.log('\n==============================');
    console.log('🎉 Import Execution Complete!');
    console.log(`✅ Successfully Imported/Updated: ${successCount}`);
    console.log(`❌ Failures / Skipped: ${failCount}`);
    console.log('==============================');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during import (Full Details):', error);
    process.exit(1);
  }
}

importMembers();