/**
 * Script to fix admin roles ENUM in the database
 * Run with: node scripts/fix-admin-roles.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const isProduction = process.env.NODE_ENV === 'production';

async function fixAdminRoles() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'naus',
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
  };

  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected!');

    // Check current ENUM values
    console.log('\nChecking current role column...');
    const [columns] = await connection.query(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'admins'
      AND COLUMN_NAME = 'role'
    `, [process.env.DB_NAME || 'naus']);

    if (columns.length > 0) {
      console.log('Current column type:', columns[0].COLUMN_TYPE);
    }

    // Update the ENUM to include all needed values
    console.log('\nUpdating role ENUM...');
    await connection.query(`
      ALTER TABLE admins
      MODIFY COLUMN role ENUM('super_admin', 'membership_admin', 'content_admin', 'admin', 'moderator')
      DEFAULT 'membership_admin'
    `);
    console.log('✅ Role ENUM updated successfully!');

    // Migrate existing 'admin' roles to 'membership_admin' if needed
    console.log('\nMigrating existing admin roles...');
    const [result] = await connection.query(`
      UPDATE admins SET role = 'membership_admin' WHERE role = 'admin'
    `);
    console.log(`✅ Migrated ${result.affectedRows} admin(s) to membership_admin`);

    // Update moderator to content_admin
    const [result2] = await connection.query(`
      UPDATE admins SET role = 'content_admin' WHERE role = 'moderator'
    `);
    console.log(`✅ Migrated ${result2.affectedRows} moderator(s) to content_admin`);

    // Now clean up the ENUM to only have the correct values
    console.log('\nCleaning up ENUM values...');
    await connection.query(`
      ALTER TABLE admins
      MODIFY COLUMN role ENUM('super_admin', 'membership_admin', 'content_admin')
      DEFAULT 'membership_admin'
    `);
    console.log('✅ ENUM cleaned up!');

    // Verify
    const [verify] = await connection.query(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'admins'
      AND COLUMN_NAME = 'role'
    `, [process.env.DB_NAME || 'naus']);
    console.log('\nFinal column type:', verify[0].COLUMN_TYPE);

    console.log('\n✅ All done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed.');
    }
  }
}

fixAdminRoles();
