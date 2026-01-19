// Create a test member account for login testing
const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');
const MemberModel = require('./models/MemberModel');

async function createTestMember() {
  let connection;

  try {
    connection = await pool.getConnection();
    console.log('✅ Connected to database\n');

    // Check if test member already exists
    const [existingUser] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['test@naus.org.ng']
    );

    if (existingUser.length > 0) {
      console.log('⚠️  Test member already exists!');
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║       TEST MEMBER CREDENTIALS          ║');
      console.log('╠════════════════════════════════════════╣');
      console.log('║ Email:    test@naus.org.ng             ║');
      console.log('║ Password: Test123!                     ║');
      console.log('║ Number:   ' + existingUser[0].membershipNumber.padEnd(27) + '║');
      console.log('╚════════════════════════════════════════╝\n');
      console.log('Use these credentials to login to the member portal.\n');
      process.exit(0);
    }

    // Generate membership number
    const membershipNumber = await MemberModel.generateMembershipNumber();
    console.log('Generated membership number:', membershipNumber);

    // Hash password
    const password = 'Test123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create member in members table
    console.log('Creating member record...');
    await connection.execute(`
      INSERT INTO members (
        membershipNumber, firstName, middleName, lastName, areaOfSpecialty,
        phoneNumber, email, streetAddress, permanentAddress, mdcnRegistrationNumber,
        yearQualifiedMBBS, additionalQualificationMDCN, yearQualifiedUrologist,
        currentPractice, nextOfKinName, nextOfKinPhone, nextOfKinEmail,
        fellowshipCollege, fwacs, fmcs, facs, frcs, others, qualificationYear,
        additionalQualification, residencyTraining, foreignInstitution,
        conferenceAttended, declaration, date, hasAccount, accountCreated, membershipType,
        isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      membershipNumber,
      'Test',
      'Member',
      'Account',
      'General Urology',
      '+2348012345678',
      'test@naus.org.ng',
      '123 Test Street, Lagos',
      '123 Test Street, Lagos',
      'MDCN/TEST/12345',
      2015,
      'Fellowship',
      2020,
      'Lagos University Teaching Hospital',
      'Emergency Contact',
      '+2348087654321',
      'emergency@test.com',
      'West African College of Surgeons',
      1, 0, 0, 0, 0,
      2020,
      'FWACS',
      'LUTH Urology',
      'N/A',
      'N/A',
      'I declare this is a test account',
      new Date(),
      1, // hasAccount
      new Date(), // accountCreated
      'new',
      1 // isActive
    ]);

    // Create user account for authentication
    console.log('Creating user authentication record...');
    await connection.execute(`
      INSERT INTO users (membershipNumber, email, password, firstName, lastName, role, isActive)
      VALUES (?, ?, ?, ?, ?, 'member', 1)
    `, [membershipNumber, 'test@naus.org.ng', hashedPassword, 'Test', 'Account']);

    console.log('\n✅ Test member created successfully!\n');
    console.log('╔════════════════════════════════════════╗');
    console.log('║       TEST MEMBER CREDENTIALS          ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║ Email:    test@naus.org.ng             ║');
    console.log('║ Password: Test123!                     ║');
    console.log('║ Number:   ' + membershipNumber.padEnd(27) + '║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\nYou can now login to the member portal with these credentials!\n');
    console.log('Member Portal URL: http://localhost:3001/member-login\n');

  } catch (err) {
    console.error('❌ Error creating test member:', err.message);
    console.error('\nFull error:', err);
    console.error('\nPossible issues:');
    console.error('- Database not running (check MySQL)');
    console.error('- Database credentials wrong (check .env file)');
    console.error('- Tables not created (run: node create-database.js)');
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
    process.exit(0);
  }
}

createTestMember();
