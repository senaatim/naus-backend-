const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  console.log('🔧 Creating NAUS Database...\n');

  // Configuration without database name
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  };

  console.log('Configuration:');
  console.log('  Host:', config.host);
  console.log('  Port:', config.port);
  console.log('  User:', config.user);
  console.log('');

  let connection;
  try {
    // Connect without specifying database
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL server!\n');

    // Create the database
    const dbName = process.env.DB_NAME || 'naus';
    console.log(`1️⃣ Creating database: ${dbName}...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log('✅ Database created/verified!\n');

    // Use the database
    console.log(`2️⃣ Using database: ${dbName}...`);
    await connection.execute(`USE \`${dbName}\``);
    console.log('✅ Database selected!\n');

    // Create applications table - using escape characters to avoid prepared statement issues
    console.log('3️⃣ Creating applications table...');
    const createApplicationsQuery = `
      CREATE TABLE IF NOT EXISTS applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(255) NOT NULL,
        middleName VARCHAR(255),
        lastName VARCHAR(255) NOT NULL,
        areaOfSpecialty TEXT NOT NULL,
        phoneNumber VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        streetAddress TEXT NOT NULL,
        permanentAddress TEXT NOT NULL,
        mdcnRegistrationNumber VARCHAR(255) NOT NULL,
        yearQualifiedMBBS INT NOT NULL,
        additionalQualificationMDCN VARCHAR(255) NOT NULL,
        yearQualifiedUrologist INT NOT NULL,
        currentPractice VARCHAR(255) NOT NULL,
        nextOfKinName VARCHAR(255) NOT NULL,
        nextOfKinPhone VARCHAR(255) NOT NULL,
        nextOfKinEmail VARCHAR(255) NOT NULL,
        fellowshipCollege VARCHAR(255) NOT NULL,
        fwacs BOOLEAN DEFAULT 0,
        fmcs BOOLEAN DEFAULT 0,
        facs BOOLEAN DEFAULT 0,
        frcs BOOLEAN DEFAULT 0,
        others BOOLEAN DEFAULT 0,
        qualificationYear INT NOT NULL,
        additionalQualification VARCHAR(255) NOT NULL,
        residencyTraining TEXT NOT NULL,
        foreignInstitution VARCHAR(255),
        conferenceAttended VARCHAR(255),
        declaration TEXT NOT NULL,
        date DATE NOT NULL,
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    await connection.execute(createApplicationsQuery);
    console.log('✅ Applications table created!\n');

    // Create members table
    console.log('4️⃣ Creating members table...');
    const createMembersQuery = `
      CREATE TABLE IF NOT EXISTS members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        membershipNumber VARCHAR(255) NOT NULL UNIQUE,
        firstName VARCHAR(255) NOT NULL,
        middleName VARCHAR(255),
        lastName VARCHAR(255) NOT NULL,
        areaOfSpecialty TEXT NOT NULL,
        phoneNumber VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        streetAddress TEXT NOT NULL,
        permanentAddress TEXT NOT NULL,
        mdcnRegistrationNumber VARCHAR(255) NOT NULL,
        yearQualifiedMBBS INT NOT NULL,
        additionalQualificationMDCN VARCHAR(255) NOT NULL,
        yearQualifiedUrologist INT NOT NULL,
        currentPractice VARCHAR(255) NOT NULL,
        nextOfKinName VARCHAR(255) NOT NULL,
        nextOfKinPhone VARCHAR(255) NOT NULL,
        nextOfKinEmail VARCHAR(255) NOT NULL,
        fellowshipCollege VARCHAR(255) NOT NULL,
        fwacs BOOLEAN DEFAULT 0,
        fmcs BOOLEAN DEFAULT 0,
        facs BOOLEAN DEFAULT 0,
        frcs BOOLEAN DEFAULT 0,
        others BOOLEAN DEFAULT 0,
        qualificationYear INT NOT NULL,
        additionalQualification VARCHAR(255) NOT NULL,
        residencyTraining TEXT NOT NULL,
        foreignInstitution VARCHAR(255),
        conferenceAttended VARCHAR(255),
        declaration TEXT NOT NULL,
        date DATE NOT NULL,
        mbbsCertificate VARCHAR(255),
        fellowshipCertificate VARCHAR(255),
        isActive BOOLEAN DEFAULT 1,
        joinedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiryDate DATE,
        membershipType ENUM('existing', 'new') DEFAULT 'new',
        hasAccount BOOLEAN DEFAULT 0,
        accountCreated TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    await connection.execute(createMembersQuery);
    console.log('✅ Members table created!\n');

    // Create users table
    console.log('5️⃣ Creating users table...');
    const createUsersQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        membershipNumber VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        role ENUM('member', 'admin') DEFAULT 'member',
        isActive BOOLEAN DEFAULT 1,
        lastLogin TIMESTAMP,
        loginCount INT DEFAULT 0,
        resetPasswordToken VARCHAR(255),
        resetPasswordExpires TIMESTAMP,
        emailVerified BOOLEAN DEFAULT 0,
        emailVerificationToken VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    await connection.execute(createUsersQuery);
    console.log('✅ Users table created!\n');

    // Create admins table
    console.log('6️⃣ Creating admins table...');
    const createAdminsQuery = `
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'membership_admin', 'content_admin') DEFAULT 'membership_admin',
        permissions JSON,
        isActive BOOLEAN DEFAULT 1,
        lastLogin TIMESTAMP,
        loginCount INT DEFAULT 0,
        resetPasswordToken VARCHAR(255),
        resetPasswordExpires TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    await connection.execute(createAdminsQuery);
    console.log('✅ Admins table created!\n');

    // Create sequence table
    console.log('7️⃣ Creating membership sequence table...');
    const createSequenceQuery = `
      CREATE TABLE IF NOT EXISTS membership_sequence (
        id INT AUTO_INCREMENT PRIMARY KEY,
        current_number INT DEFAULT 1,
        year INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_year (year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    await connection.execute(createSequenceQuery);
    console.log('✅ Membership sequence table created!\n');

    // Initialize sequence
    console.log('8️⃣ Initializing membership sequence...');
    const currentYear = new Date().getFullYear();
    await connection.execute(`
      INSERT IGNORE INTO membership_sequence (year, current_number) 
      VALUES (${currentYear}, 1)
    `);
    console.log(`✅ Sequence initialized for year ${currentYear}!\n`);

    console.log('🎉 All tables created successfully!');
    console.log('📊 Database name: naus');
    console.log('📋 Available tables: applications, members, users, admins, membership_sequence');

  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    console.error('Error code:', error.code);
    console.error('SQL State:', error.sqlState);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Connection closed!');
    }
  }
}

createDatabase().catch(console.error);