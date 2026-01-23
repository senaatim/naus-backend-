const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const {
  uploadPhoto,
  uploadCertificate,
  deleteFromCloudinary,
  getPublicIdFromUrl
} = require('../config/cloudinary');

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

// =====================================================
// SPECIFIC PROFILE SUB-ROUTES (must be defined BEFORE general /profile routes)
// =====================================================

// POST upload profile photo (Cloudinary)
router.post('/profile/photo', authenticateToken, uploadPhoto.single('photo'), async (req, res) => {
  let connection;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
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

    // Cloudinary returns the URL in req.file.path
    const photoUrl = req.file.path;
    console.log('Photo uploaded to Cloudinary:', photoUrl);

    // Get current photo to delete old one from Cloudinary
    const [members] = await connection.execute(
      'SELECT profilePhoto FROM members WHERE membershipNumber = ?',
      [membershipNumber]
    );

    // Delete old photo from Cloudinary if exists
    if (members.length > 0 && members[0].profilePhoto) {
      const oldPublicId = getPublicIdFromUrl(members[0].profilePhoto);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
        console.log('Deleted old photo from Cloudinary:', oldPublicId);
      }
    }

    // Update profile photo in database (store full Cloudinary URL)
    await connection.execute(
      'UPDATE members SET profilePhoto = ? WHERE membershipNumber = ?',
      [photoUrl, membershipNumber]
    );

    res.json({
      message: 'Profile photo uploaded successfully',
      photoUrl: photoUrl
    });

  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ message: 'Error uploading profile photo', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// PUT update privacy settings (directory visibility)
router.put('/profile/privacy', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { showInDirectory } = req.body;

    if (typeof showInDirectory !== 'boolean') {
      return res.status(400).json({ message: 'showInDirectory must be a boolean' });
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

    // Update privacy setting
    await connection.execute(
      'UPDATE members SET showInDirectory = ? WHERE membershipNumber = ?',
      [showInDirectory ? 1 : 0, membershipNumber]
    );

    res.json({
      message: 'Privacy settings updated successfully',
      showInDirectory: showInDirectory
    });

  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ message: 'Error updating privacy settings', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// =====================================================
// GENERAL PROFILE ROUTES
// =====================================================

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
      profilePhoto: member.profilePhoto,
      showInDirectory: member.showInDirectory,
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

// POST upload certificate (Cloudinary)
router.post('/certificates/upload', authenticateToken, uploadCertificate.single('certificate'), async (req, res) => {
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

    // Cloudinary returns the URL in req.file.path
    const certificateUrl = req.file.path;
    console.log('Certificate uploaded to Cloudinary:', certificateUrl);

    // Get current certificate to delete old one from Cloudinary
    const column = certificateType === 'mbbs' ? 'mbbsCertificate' : 'fellowshipCertificate';
    const [members] = await connection.execute(
      `SELECT ${column} as currentCert FROM members WHERE membershipNumber = ?`,
      [membershipNumber]
    );

    // Delete old certificate from Cloudinary if exists
    if (members.length > 0 && members[0].currentCert) {
      const oldPublicId = getPublicIdFromUrl(members[0].currentCert);
      if (oldPublicId) {
        // Determine resource type based on file extension
        const resourceType = members[0].currentCert.includes('.pdf') ? 'raw' : 'image';
        await deleteFromCloudinary(oldPublicId, resourceType);
        console.log('Deleted old certificate from Cloudinary:', oldPublicId);
      }
    }

    // Update certificate URL in database (store full Cloudinary URL)
    await connection.execute(
      `UPDATE members SET ${column} = ? WHERE membershipNumber = ?`,
      [certificateUrl, membershipNumber]
    );

    res.json({
      message: 'Certificate uploaded successfully',
      certificateUrl: certificateUrl,
      certificateType: certificateType
    });

  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({ message: 'Error uploading certificate', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// GET download certificate (redirects to Cloudinary URL)
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

    // Get certificate URL from database
    const [members] = await connection.execute(
      `SELECT ${column} as certificateUrl FROM members WHERE membershipNumber = ?`,
      [membershipNumber]
    );

    if (members.length === 0 || !members[0].certificateUrl) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const certificateUrl = members[0].certificateUrl;

    // Redirect to Cloudinary URL for download
    res.redirect(certificateUrl);

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

// GET member directory (public - shows only members who opted in)
router.get('/directory', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { search, specialty } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        membershipNumber,
        firstName,
        middleName,
        lastName,
        areaOfSpecialty,
        currentPractice,
        profilePhoto,
        joinedDate
      FROM members
      WHERE showInDirectory = 1 AND isActive = 1
    `;

    const params = [];

    if (search) {
      query += ` AND (firstName LIKE ? OR lastName LIKE ? OR currentPractice LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (specialty) {
      query += ` AND areaOfSpecialty LIKE ?`;
      params.push(`%${specialty}%`);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const [countResult] = await connection.execute(countQuery, params);
    const total = countResult[0].total;

    // Add pagination - use template literal for LIMIT/OFFSET to avoid mysql2 binding issues
    query += ` ORDER BY lastName, firstName LIMIT ${limit} OFFSET ${offset}`;

    const [members] = await connection.execute(query, params);

    res.json({
      members: members,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching member directory:', error);
    res.status(500).json({ message: 'Error fetching member directory', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// GET single member profile for directory (public)
router.get('/directory/:membershipNumber', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { membershipNumber } = req.params;

    const [members] = await connection.execute(`
      SELECT
        membershipNumber,
        firstName,
        middleName,
        lastName,
        areaOfSpecialty,
        currentPractice,
        profilePhoto,
        joinedDate,
        fellowshipCollege,
        fwacs,
        fmcs,
        facs,
        frcs
      FROM members
      WHERE membershipNumber = ? AND showInDirectory = 1 AND isActive = 1
    `, [membershipNumber]);

    if (members.length === 0) {
      return res.status(404).json({ message: 'Member not found or profile is private' });
    }

    const member = members[0];

    res.json(member);

  } catch (error) {
    console.error('Error fetching member profile:', error);
    res.status(500).json({ message: 'Error fetching member profile', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// GET verify member (public - for QR code verification)
router.get('/verify/:membershipNumber', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { membershipNumber } = req.params;

    const [members] = await connection.execute(`
      SELECT
        membershipNumber,
        firstName,
        middleName,
        lastName,
        areaOfSpecialty,
        currentPractice,
        profilePhoto,
        isActive,
        joinedDate,
        membershipType
      FROM members
      WHERE membershipNumber = ?
    `, [membershipNumber]);

    if (members.length === 0) {
      return res.status(404).json({
        verified: false,
        message: 'Member not found'
      });
    }

    const member = members[0];

    res.json({
      verified: true,
      member: {
        membershipNumber: member.membershipNumber,
        firstName: member.firstName,
        middleName: member.middleName,
        lastName: member.lastName,
        areaOfSpecialty: member.areaOfSpecialty,
        currentPractice: member.currentPractice,
        profilePhoto: member.profilePhoto,
        isActive: member.isActive,
        joinedDate: member.joinedDate,
        membershipType: member.membershipType
      }
    });

  } catch (error) {
    console.error('Error verifying member:', error);
    res.status(500).json({
      verified: false,
      message: 'Error verifying member'
    });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;