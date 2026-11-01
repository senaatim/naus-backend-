const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase with the secure Service Role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestMember() {
  console.log('🔧 Creating Supabase test member...\n');

  const testEmail = 'test@naus.org.ng';
  const testPassword = 'Test123!';
  const testMembershipNumber = 'NAUS-2026001'; // Custom or test format

  try {
    // 1. Check if user already exists in Supabase Auth
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;

    const userExists = existingUsers.users.find(u => u.email === testEmail);

    if (userExists) {
      console.log('⚠️  Test member already exists in Supabase Auth!');
      printCredentials(testEmail, testPassword, testMembershipNumber);
      process.exit(0);
    }

    // 2. Create user in Supabase Auth (Supabase handles password hashing automatically)
    console.log('Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true // Automatically mark email as verified
    });

    if (authError) {
      throw new Error(`Auth creation failed: ${authError.message}`);
    }

    const userId = authData.user.id;
    console.log('✅ Auth user created with ID:', userId);

    // 3. Create member record in your 'members' table
    console.log('Creating member profile record...');
    const { error: dbError } = await supabase
      .from('members')
      .insert([
        {
          id: userId, // Links to Supabase Auth ID
          membershipnumber: testMembershipNumber,
          firstname: 'Test',
          middlename: 'Member',
          lastname: 'Account',
          areaofspecialty: 'General Urology',
          phonenumber: '+2348012345678',
          email: testEmail,
          streetaddress: '123 Test Street, Lagos',
          permanentaddress: '123 Test Street, Lagos',
          mdcnregistrationnumber: 'MDCN/TEST/12345',
          yearqualifiedmbbs: 2015,
          additionalqualificationmdcn: 'Fellowship',
          yearqualifiedurologist: 2020,
          currentpractice: 'Lagos University Teaching Hospital',
          nextofkinname: 'Emergency Contact',
          nextofkinphone: '+2348087654321',
          nextofkinemail: 'emergency@test.com',
          fellowshipcollege: 'West African College of Surgeons',
          fwacs: true,
          fmcs: false,
          facs: false,
          frcs: false,
          others: false,
          qualificationyear: 2020,
          additionalqualification: 'FWACS',
          residencytraining: 'LUTH Urology',
          foreigninstitution: 'N/A',
          conferenceattended: 'N/A',
          declaration: 'I declare this is a test account',
          date: new Date().toISOString().split('T')[0],
          membershiptype: 'new',
          isactive: true
        }
      ]);

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    console.log('\n✅ Test member created successfully in Supabase!\n');
    printCredentials(testEmail, testPassword, testMembershipNumber);

  } catch (err) {
    console.error('❌ Error creating test member:', err.message);
    process.exit(1);
  }
}

function printCredentials(email, password, membershipNumber) {
  console.log('╔════════════════════════════════════════╗');
  console.log('║       SUPABASE TEST CREDENTIALS        ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║ Email:    ${email.padEnd(28)} ║`);
  console.log(`║ Password: ${password.padEnd(28)} ║`);
  console.log(`║ Number:   ${membershipNumber.padEnd(28)} ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('\nYou can now login using Supabase Auth in your backend app!\n');
}

createTestMember();