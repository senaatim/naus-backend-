const { pool } = require('../config/database');

class UserModel {
  static async create(userData) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(`
        INSERT INTO users (
          membershipNumber, email, password, firstName, lastName, role
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        userData.membershipNumber,
        userData.email,
        userData.password,
        userData.firstName,
        userData.lastName,
        userData.role || 'member'
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error); // DEBUG LOG
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
      const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error); // DEBUG LOG
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
      const [rows] = await connection.execute('SELECT * FROM users WHERE membershipNumber = ?', [membershipNumber]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding user by membership number:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async updateLastLogin(userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(`
        UPDATE users 
        SET lastLogin = NOW(), loginCount = loginCount + 1
        WHERE id = ?
      `, [userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating last login:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  static async updatePassword(userId, newPassword) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(`
        UPDATE users 
        SET password = ?
        WHERE id = ?
      `, [newPassword, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating password:', error); // DEBUG LOG
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

module.exports = UserModel;