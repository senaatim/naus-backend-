const { pool } = require('../config/database');

class MemberModel {
  // Generate next membership number (format: NAUS-YYYYNNN)
  static async generateMembershipNumber() {
    let connection;
    try {
      connection = await pool.getConnection();
      const currentYear = new Date().getFullYear();

      // Get the highest sequence number from existing membership numbers
      // Check both new format (NAUS-YYYYNNN) and old format (YYYYNNN)
      const [rows] = await connection.execute(`
        SELECT
          CASE
            WHEN membershipNumber LIKE 'NAUS-%' THEN CAST(SUBSTRING(membershipNumber, 10) AS UNSIGNED)
            ELSE CAST(SUBSTRING(membershipNumber, 5) AS UNSIGNED)
          END as sequenceNum
        FROM members
        WHERE membershipNumber IS NOT NULL
        ORDER BY sequenceNum DESC
        LIMIT 1
      `);

      let sequenceNumber = 1;
      if (rows.length > 0 && rows[0].sequenceNum) {
        sequenceNumber = rows[0].sequenceNum + 1;
      }

      return `NAUS-${currentYear}${sequenceNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating membership number:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async create(memberData) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(`
        INSERT INTO members (
          membershipNumber, firstName, middleName, lastName, areaOfSpecialty,
          phoneNumber, email, streetAddress, permanentAddress, mdcnRegistrationNumber,
          yearQualifiedMBBS, additionalQualificationMDCN, yearQualifiedUrologist,
          currentPractice, nextOfKinName, nextOfKinPhone, nextOfKinEmail,
          fellowshipCollege, fwacs, fmcs, facs, frcs, others, qualificationYear,
          additionalQualification, residencyTraining, foreignInstitution,
          conferenceAttended, declaration, date, mbbsCertificate, fellowshipCertificate,
          hasAccount, accountCreated, membershipType
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        memberData.membershipNumber,
        memberData.firstName,
        memberData.middleName,
        memberData.lastName,
        memberData.areaOfSpecialty,
        memberData.phoneNumber,
        memberData.email,
        memberData.streetAddress,
        memberData.permanentAddress,
        memberData.mdcnRegistrationNumber,
        memberData.yearQualifiedMBBS,
        memberData.additionalQualificationMDCN,
        memberData.yearQualifiedUrologist,
        memberData.currentPractice,
        memberData.nextOfKinName,
        memberData.nextOfKinPhone,
        memberData.nextOfKinEmail,
        memberData.fellowshipCollege,
        memberData.fwacs,
        memberData.fmcs,
        memberData.facs,
        memberData.frcs,
        memberData.others,
        memberData.qualificationYear,
        memberData.additionalQualification,
        memberData.residencyTraining,
        memberData.foreignInstitution,
        memberData.conferenceAttended,
        memberData.declaration,
        memberData.date,
        memberData.mbbsCertificate,
        memberData.fellowshipCertificate,
        memberData.hasAccount,
        memberData.accountCreated,
        memberData.membershipType
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error creating member:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async findByMembershipNumber(membershipNumber) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM members WHERE membershipNumber = ?', [membershipNumber]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding member by membership number:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async findByEmail(email) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM members WHERE email = ?', [email]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding member by email:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async findAll() {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM members ORDER BY createdAt DESC');
      return rows;
    } catch (error) {
      console.error('Error finding all members:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async updateAccountStatus(membershipNumber, hasAccount = true) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(`
        UPDATE members 
        SET hasAccount = ?, accountCreated = NOW()
        WHERE membershipNumber = ?
      `, [hasAccount, membershipNumber]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating account status:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

module.exports = MemberModel;