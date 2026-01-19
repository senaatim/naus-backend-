// Create a super admin account
const bcrypt = require('bcryptjs');
const { sequelize, Admin } = require('./models');

async function createAdmin() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ where: { email: 'admin@naus.org.ng' } });

    if (existingAdmin) {
      console.log('⚠️  Admin already exists:');
      console.log('   Email:', existingAdmin.email);
      console.log('   Name:', existingAdmin.name);
      console.log('   Role:', existingAdmin.role);
      console.log('   Active:', existingAdmin.isActive);
      console.log('\nIf you forgot the password, delete this admin and run the script again.');
      process.exit(0);
    }

    // Hash password
    const password = 'Admin123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await Admin.create({
      name: 'Super Admin',
      email: 'admin@naus.org.ng',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true
    });

    console.log('✅ Super Admin created successfully!\n');
    console.log('╔════════════════════════════════════════╗');
    console.log('║         ADMIN CREDENTIALS              ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║ Email:    admin@naus.org.ng            ║');
    console.log('║ Password: Admin123!                    ║');
    console.log('║ Role:     super_admin                  ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    console.error('\nPossible issues:');
    console.error('- Database not running (check MySQL/PostgreSQL)');
    console.error('- Database credentials wrong (check .env file)');
    console.error('- Tables not created (run: node create-database.js)');
    process.exit(1);
  }
}

createAdmin();
