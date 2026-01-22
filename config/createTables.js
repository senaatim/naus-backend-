const mysql = require('mysql2/promise');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const createTables = async () => {
  const configWithoutDb = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
  };

  let connection;
  try {
    connection = await mysql.createConnection(configWithoutDb);
    console.log('✅ Connected to MySQL server!');

    const dbName = process.env.DB_NAME || 'naus';
    console.log(`Creating database: ${dbName}...`);
    // USE .query instead of .execute for DDL (Data Definition Language)
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' created successfully!`);

    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ Using database: ${dbName}`);

    console.log('Creating applications table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        middleName VARCHAR(255),
        lastName VARCHAR(255) NOT NULL,
        areaOfSpecialty TEXT,
        phoneNumber VARCHAR(255),
        email VARCHAR(255) NOT NULL UNIQUE,
        streetAddress TEXT,
        permanentAddress TEXT,
        mdcnRegistrationNumber VARCHAR(255),
        yearQualifiedMBBS INT,
        additionalQualificationMDCN VARCHAR(255),
        yearQualifiedUrologist INT,
        currentPractice VARCHAR(255),
        nextOfKinName VARCHAR(255),
        nextOfKinPhone VARCHAR(255),
        nextOfKinEmail VARCHAR(255),
        fellowshipCollege VARCHAR(255),
        fwacs BOOLEAN DEFAULT 0,
        fmcs BOOLEAN DEFAULT 0,
        facs BOOLEAN DEFAULT 0,
        frcs BOOLEAN DEFAULT 0,
        others BOOLEAN DEFAULT 0,
        qualificationYear INT,
        additionalQualification VARCHAR(255),
        residencyTraining TEXT,
        foreignInstitution VARCHAR(255),
        conferenceAttended VARCHAR(255),
        declaration TEXT,
        date DATE,
        status ENUM('pending', 'approved', 'rejected', 'under_review') DEFAULT 'pending',
        reviewedBy INT,
        reviewedAt DATETIME,
        adminNotes TEXT,
        paymentStatus ENUM('pending', 'paid', 'not_paid') DEFAULT 'not_paid',
        membershipNumber VARCHAR(255),
        mbbsCertificate VARCHAR(255),
        fellowshipCertificate VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Applications table created!');

    console.log('Creating members table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        membershipNumber VARCHAR(255) NOT NULL UNIQUE,
        firstName VARCHAR(255) NOT NULL,
        middleName VARCHAR(255),
        lastName VARCHAR(255) NOT NULL,
        areaOfSpecialty TEXT,
        phoneNumber VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        streetAddress TEXT,
        permanentAddress TEXT,
        mdcnRegistrationNumber VARCHAR(255),
        yearQualifiedMBBS INT,
        additionalQualificationMDCN VARCHAR(255),
        yearQualifiedUrologist INT,
        currentPractice VARCHAR(255),
        nextOfKinName VARCHAR(255),
        nextOfKinPhone VARCHAR(255),
        nextOfKinEmail VARCHAR(255),
        fellowshipCollege VARCHAR(255),
        fwacs BOOLEAN DEFAULT 0,
        fmcs BOOLEAN DEFAULT 0,
        facs BOOLEAN DEFAULT 0,
        frcs BOOLEAN DEFAULT 0,
        others BOOLEAN DEFAULT 0,
        qualificationYear INT,
        additionalQualification VARCHAR(255),
        residencyTraining TEXT,
        foreignInstitution VARCHAR(255),
        conferenceAttended VARCHAR(255),
        declaration TEXT,
        date DATE,
        mbbsCertificate VARCHAR(255),
        fellowshipCertificate VARCHAR(255),
        isActive BOOLEAN DEFAULT 1,
        joinedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiryDate DATE,
        membershipType ENUM('existing', 'new') DEFAULT 'new',
        hasAccount BOOLEAN DEFAULT 0,
        accountCreated TIMESTAMP NULL,
        profilePhoto VARCHAR(255),
        showInDirectory BOOLEAN DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Members table created!');

    // Add new columns if they don't exist (for existing databases)
    console.log('Adding new columns if they do not exist...');
    try {
      // Check if profilePhoto column exists
      const [profilePhotoCol] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'members' AND COLUMN_NAME = 'profilePhoto'
      `);
      if (profilePhotoCol.length === 0) {
        await connection.query(`ALTER TABLE members ADD COLUMN profilePhoto VARCHAR(255)`);
        console.log('✅ profilePhoto column added!');
      }

      // Check if showInDirectory column exists
      const [showInDirCol] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'members' AND COLUMN_NAME = 'showInDirectory'
      `);
      if (showInDirCol.length === 0) {
        await connection.query(`ALTER TABLE members ADD COLUMN showInDirectory BOOLEAN DEFAULT 1`);
        console.log('✅ showInDirectory column added!');
      }

      // Update existing NULL values to default
      await connection.query(`UPDATE members SET showInDirectory = 1 WHERE showInDirectory IS NULL`);

      console.log('✅ New columns verified!');
    } catch (alterError) {
      console.log('Column check/add error:', alterError.message);
    }

    console.log('Creating users table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        membershipNumber VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        role ENUM('member', 'admin') DEFAULT 'member',
        isActive BOOLEAN DEFAULT 1,
        lastLogin TIMESTAMP NULL,
        loginCount INT DEFAULT 0,
        resetPasswordToken VARCHAR(255),
        resetPasswordExpires TIMESTAMP NULL,
        emailVerified BOOLEAN DEFAULT 0,
        emailVerificationToken VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Users table created!');

    console.log('Creating admins table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'membership_admin', 'content_admin') DEFAULT 'membership_admin',
        permissions JSON,
        isActive BOOLEAN DEFAULT 1,
        lastLogin TIMESTAMP NULL,
        loginCount INT DEFAULT 0,
        resetPasswordToken VARCHAR(255),
        resetPasswordExpires TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Admins table created!');

    console.log('Creating membership sequence table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS membership_sequence (
        id INT AUTO_INCREMENT PRIMARY KEY,
        current_number INT DEFAULT 1,
        year INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_year (year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Membership sequence table created!');

    console.log('✅ All tables created successfully!');
    
    const currentYear = new Date().getFullYear();
    await connection.query(`
      INSERT IGNORE INTO membership_sequence (year, current_number) 
      VALUES (${currentYear}, 1)
    `);
    
    console.log(`✅ Membership sequence initialized for year ${currentYear}!`);

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Connection closed!');
    }
  }
};

if (require.main === module) {
  createTables();
}

module.exports = createTables;