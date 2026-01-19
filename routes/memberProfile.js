const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_production', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Configure multer for certificate uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/certificates');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cert-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'));
    }
  }
});

// GET member profile
router.get('/profile', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Get user info
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Get member details
    const [members] = await connection.execute(
      'SELECT * FROM members WHERE membershipNumber = ?',
      [user.membershipNumber]
    );

    if (members.length === 0) {
      return res.status(404).json({ message: 'Member profile not found' });
    }

    const member = members[0];

    // Return combined profile data
    res.json({
      id: user.id,
      membershipNumber: user.membershipNumber,
      email: user.email,
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      phoneNumber: member.phoneNumber,
      areaOfSpecialty: member.areaOfSpecialty,
      streetAddress: member.streetAddress,
      permanentAddress: member.permanentAddress,
      mdcnRegistrationNumber: member.mdcnRegistrationNumber,
      yearQualifiedMBBS: member.yearQualifiedMBBS,
      additionalQualificationMDCN: member.additionalQualificationMDCN,
      yearQualifiedUrologist: member.yearQualifiedUrologist,
      currentPractice: member.currentPractice,
      nextOfKinName: member.nextOfKinName,
      nextOfKinPhone: member.nextOfKinPhone,
      nextOfKinEmail: member.nextOfKinEmail,
      fellowshipCollege: member.fellowshipCollege,
      fwacs: member.fwacs,
      fmcs: member.fmcs,
      facs: member.facs,
      frcs: member.frcs,
      others: member.others,
      qualificationYear: member.qualificationYear,
      additionalQualification: member.additionalQualification,
      residencyTraining: member.residencyTraining,
      foreignInstitution: member.foreignInstitution,
      conferenceAttended: member.conferenceAttended,
      mbbsCertificate: member.mbbsCertificate,
      fellowshipCertificate: member.fellowshipCertificate,
      membershipType: member.membershipType,
      isActive: member.isActive,
      joinedDate: member.joinedDate,
      createdAt: member.createdAt
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// PUT update member profile
router.put('/profile', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const {
      firstName,
      middleName,
      lastName,
      phoneNumber,
      streetAddress,
      permanentAddress,
      currentPractice,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinEmail
    } = req.body;

    // Get user's membership number
    const [users] = await connection.execute(
      'SELECT membershipNumber FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const membershipNumber = users[0].membershipNumber;

    // Update member profile
    await connection.execute(`
      UPDATE members
      SET firstName = ?, middleName = ?, lastName = ?, phoneNumber = ?,
          streetAddress = ?, permanentAddress = ?, currentPractice = ?,
          nextOfKinName = ?, nextOfKinPhone = ?, nextOfKinEmail = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE membershipNumber = ?
    `, [
      firstName,
      middleName,
      lastName,
      phoneNumber,
      streetAddress,
      permanentAddress,
      currentPractice,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinEmail,
      membershipNumber
    ]);

    // Update user's name
    await connection.execute(
      'UPDATE users SET firstName = ?, lastName = ? WHERE id = ?',
      [firstName, lastName, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// POST upload certificate
router.post('/certificates/upload', authenticateToken, upload.single('certificate'), async (req, res) => {
  let connection;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { certificateType } = req.body; // 'mbbs' or 'fellowship'

    if (!['mbbs', 'fellowship'].includes(certificateType)) {
      return res.status(400).json({ message: 'Invalid certificate type. Use "mbbs" or "fellowship"' });
    }

    connection = await pool.getConnection();

    // Get user's membership number
    const [users] = await connection.execute(
      'SELECT membershipNumber FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const membershipNumber = users[0].membershipNumber;
    const fileName = 'certificates/' + req.file.filename;

    // Update certificate path in database
    const column = certificateType === 'mbbs' ? 'mbbsCertificate' : 'fellowshipCertificate';

    await connection.execute(
      `UPDATE members SET ${column} = ? WHERE membershipNumber = ?`,
      [fileName, membershipNumber]
    );

    res.json({
      message: 'Certificate uploaded successfully',
      fileName: fileName,
      certificateType: certificateType
    });

  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({ message: 'Error uploading certificate', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// GET download certificate
router.get('/certificates/:type', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { type } = req.params; // 'mbbs' or 'fellowship'

    if (!['mbbs', 'fellowship'].includes(type)) {
      return res.status(400).json({ message: 'Invalid certificate type' });
    }

    connection = await pool.getConnection();

    // Get user's membership number
    const [users] = await connection.execute(
      'SELECT membershipNumber FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const membershipNumber = users[0].membershipNumber;
    const column = type === 'mbbs' ? 'mbbsCertificate' : 'fellowshipCertificate';

    // Get certificate path
    const [members] = await connection.execute(
      `SELECT ${column} as certificatePath FROM members WHERE membershipNumber = ?`,
      [membershipNumber]
    );

    if (members.length === 0 || !members[0].certificatePath) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const certificatePath = members[0].certificatePath;
    const filePath = path.join(__dirname, '../uploads', certificatePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Certificate file not found on server' });
    }

    // Send file
    res.download(filePath);

  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ message: 'Error downloading certificate', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// POST change password
router.post('/change-password', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    connection = await pool.getConnection();

    // Get current password hash
    const [users] = await connection.execute(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const bcrypt = require('bcryptjs');

    console.log('Change password attempt for user ID:', req.user.id);
    console.log('Stored password hash exists:', !!users[0].password);
    console.log('Stored password hash length:', users[0].password?.length);

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await connection.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Error changing password', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
