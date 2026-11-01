const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importExcelBatch() {
  // 1. Read the Excel workbook
  const workbook = XLSX.readFile('hod-members.xlsx'); // Name of your Excel file
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert sheet to JSON array
  const rawData = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`📊 Total rows found in Excel: ${rawData.length}`);

  // 2. Handle 2-Day Batching via terminal arguments (`node import-excel.js 1` or `2`)
  const batchArg = process.argv[2] || '1';
  const BATCH_SIZE = 100;
  
  let startIndex = 0;
  let endIndex = BATCH_SIZE;

  if (batchArg === '2') {
    startIndex = 100;
    endIndex = 200;
    console.log('📅 Running BATCH 2 (Rows 101 to 200)...');
  } else {
    console.log('📅 Running BATCH 1 (Rows 1 to 100)...');
  }

  const currentBatch = rawData.slice(startIndex, endIndex);

  if (currentBatch.length === 0) {
    console.log('⚠️ No members found in this batch range.');
    process.exit(0);
  }

  console.log(`🚀 Starting import for ${currentBatch.length} members in this batch...\n`);

  let successCount = 0;
  let missingEmailCount = 0;
  let failCount = 0;

  for (const row of currentBatch) {
    // Flexible header mapping (handles common Excel header names)
    const rawEmail = row.Email || row.email || row.EMAIL;
    const firstName = row.FirstName || row.firstName || row.First_Name || 'Member';
    const lastName = row.LastName || row.lastName || row.Last_Name || '';
    const membershipNumber = row.MembershipNumber || row.membershipNumber || row.Membership_Number || row.Number;

    const email = rawEmail ? String(rawEmail).trim() : null;

    try {
      // 3. Handle members WITHOUT emails
      if (!email || email === '' || email.toLowerCase() === 'nan') {
        console.log(`⚠️ Missing email for ${membershipNumber} (${firstName} ${lastName}). Saving profile record only...`);
        
        const { error: dbError } = await supabase
          .from('members')
          .insert([
            {
              membershipnumber: membershipNumber,
              firstname: firstName,
              lastname: lastName,
              email: null,
              membershiptype: 'existing',
              hasaccount: false,
              isactive: false,
              declaration: 'Imported via HOD Excel (No Email)',
              date: new Date().toISOString().split('T')[0]
            }
          ]);

        if (dbError) {
          console.error(`❌ DB error for ${membershipNumber}:`, dbError.message);
          failCount++;
        } else {
          missingEmailCount++;
        }
        continue; // Safely skip to next member inside for...of loop
      }

      // 4. Create user in Supabase Auth (for members WITH emails)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: Math.random().toString(36).slice(-12) + 'A1!',
        email_confirm: true
      });

      if (authError) {
        console.error(`❌ Auth error for ${email}:`, authError.message);
        failCount++;
        continue;
      }

      const userId = authData.user.id;

      // 5. Insert member record with UUID link to Supabase Auth
      const { error: dbError } = await supabase
        .from('members')
        .insert([
          {
            id: userId,
            membershipnumber: membershipNumber,
            firstname: firstName,
            lastname: lastName,
            email: email,
            membershiptype: 'existing',
            hasaccount: true,
            isactive: true,
            declaration: 'Imported via HOD Excel',
            date: new Date().toISOString().split('T')[0]
          }
        ]);

      if (dbError) {
        console.error(`❌ DB error for ${email}:`, dbError.message);
        failCount++;
        continue;
      }

      // 6. Trigger password recovery email via Resend SMTP
      const { error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email
      });

      if (resetError) {
        console.error(`❌ Failed to send reset link to ${email}:`, resetError.message);
      } else {
        console.log(`✅ Imported & sent reset email to: ${email} (${membershipNumber})`);
        successCount++;
      }

    } catch (err) {
      console.error(`❌ Unexpected error for row:`, err.message);
      failCount++;
    }
  }

  console.log('\n==============================');
  console.log(`🎉 Batch Execution Complete!`);
  console.log(`✅ Auth Created & Emailed: ${successCount}`);
  console.log(`⚠️ Saved Profile Only (No Email): ${missingEmailCount}`);
  console.log(`❌ Failures: ${failCount}`);
  console.log('==============================\n');
}

importExcelBatch();