require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const NEW_PASSWORD = 'admin123';
const ADMIN_EMAIL = 'senaatim10@gmail.com';

const isProduction = process.env.NODE_ENV === 'production';

async function resetPassword() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'naus',
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
  });

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

    // Update the password
    const [result] = await connection.execute(
      'UPDATE admins SET password = ? WHERE email = ?',
      [hashedPassword, ADMIN_EMAIL]
    );

    if (result.affectedRows > 0) {
      console.log('✅ Password updated successfully!');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`New Password: ${NEW_PASSWORD}`);
    } else {
      console.log('❌ No admin found with that email. Creating new admin...');

      // Create admin if doesn't exist
      await connection.execute(
        'INSERT INTO admins (email, password, name, role, isActive) VALUES (?, ?, ?, ?, ?)',
        [ADMIN_EMAIL, hashedPassword, 'Admin', 'super_admin', 1]
      );
      console.log('✅ Admin created successfully!');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Password: ${NEW_PASSWORD}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

resetPassword();
