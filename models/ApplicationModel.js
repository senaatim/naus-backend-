const { pool } = require('../config/database');

class ApplicationModel {
  static async create(applicationData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const query = `
        INSERT INTO applications (
          firstName, middleName, lastName, areaOfSpecialty, phoneNumber, email,
          streetAddress, permanentAddress, mdcnRegistrationNumber, yearQualifiedMBBS,
          additionalQualificationMDCN, yearQualifiedUrologist, currentPractice,
          nextOfKinName, nextOfKinPhone, nextOfKinEmail, fellowshipCollege,
          fwacs, fmcs, facs, frcs, others, qualificationYear, additionalQualification,
          residencyTraining, foreignInstitution, conferenceAttended, declaration, date,
          mbbsCertificate, fellowshipCertificate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await connection.execute(query, [
        applicationData.firstName,
        applicationData.middleName,
        applicationData.lastName,
        applicationData.areaOfSpecialty,
        applicationData.phoneNumber,
        applicationData.email,
        applicationData.streetAddress,
        applicationData.permanentAddress,
        applicationData.mdcnRegistrationNumber,
        applicationData.yearQualifiedMBBS,
        applicationData.additionalQualificationMDCN,
        applicationData.yearQualifiedUrologist,
        applicationData.currentPractice,
        applicationData.nextOfKinName,
        applicationData.nextOfKinPhone,
        applicationData.nextOfKinEmail,
        applicationData.fellowshipCollege,
        applicationData.fwacs,
        applicationData.fmcs,
        applicationData.facs,
        applicationData.frcs,
        applicationData.others,
        applicationData.qualificationYear,
        applicationData.additionalQualification,
        applicationData.residencyTraining,
        applicationData.foreignInstitution,
        applicationData.conferenceAttended,
        applicationData.declaration,
        applicationData.date,
        applicationData.mbbsCertificate,
        applicationData.fellowshipCertificate
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error creating application:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async findById(id) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM applications WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding application by ID:', error); // DEBUG LOG
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
      const [rows] = await connection.execute('SELECT * FROM applications WHERE email = ?', [email]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding application by email:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async findAll(status = null) {
    let connection;
    try {
      connection = await pool.getConnection();
      let query = 'SELECT * FROM applications ORDER BY createdAt DESC';
      let params = [];
      
      if (status) {
        query = 'SELECT * FROM applications WHERE status = ? ORDER BY createdAt DESC';
        params = [status];
      }
      
      const [rows] = await connection.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error finding all applications:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async updateStatus(id, status, reviewedBy = null, notes = null) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(`
        UPDATE applications 
        SET status = ?, reviewedBy = ?, reviewedAt = NOW(), adminNotes = ?
        WHERE id = ?
      `, [status, reviewedBy, notes, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating application status:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async updateMembershipNumber(id, membershipNumber) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(`
        UPDATE applications 
        SET membershipNumber = ?
        WHERE id = ?
      `, [membershipNumber, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating membership number:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

module.exports = ApplicationModel;