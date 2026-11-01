// Create a super admin account
const bcrypt = require('bcryptjs');
const { sequelize, Admin } = require('./models');

async function createAdmin() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    const targetEmail = 'senaatim10@gmail.com';
    const password = 'Admin123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if admin already exists
    let admin = await Admin.findOne({ where: { email: targetEmail } });

    if (admin) {
      // Update existing record to ensure super_admin role and active status
      admin.role = 'super_admin';
      admin.isActive = true;
      admin.password = hashedPassword;
      admin.name = 'Sena Atim';
      await admin.save();
      console.log('⚠️ Admin already existed. Credentials and role updated successfully!\n');
    } else {
      // Create new super admin
      admin = await Admin.create({
        name: 'Sena Atim',
        email: targetEmail,
        password: hashedPassword,
        role: 'super_admin',
        isActive: true
      });
      console.log('✅ Super Admin created successfully!\n');
    }

    console.log('╔════════════════════════════════════════╗');
    console.log('║            ADMIN CREDENTIALS           ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║ Email:    senaatim10@gmail.com         ║');
    console.log('║ Password: Admin123!                    ║');
    console.log('║ Role:     super_admin                  ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    console.error('\nPossible issues:');
    console.error('- Database not running');
    console.error('- Database credentials wrong (check .env file)');
    console.error('- Tables not created');
    process.exit(1);
  }
}

createAdmin();