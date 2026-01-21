const { pool } = require('../config/database');

// Get all members with pagination, search, and filter
const getAllMembers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const specialty = req.query.specialty || '';
    const status = req.query.status || '';
    const membershipType = req.query.membershipType || '';

    const offset = (page - 1) * limit;

    // Build WHERE clause based on filters
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push(`(firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR membershipNumber LIKE ?)`);
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (specialty) {
      whereConditions.push('areaOfSpecialty = ?');
      queryParams.push(specialty);
    }

    if (status !== '') {
      whereConditions.push('isActive = ?');
      queryParams.push(status === 'active' ? 1 : 0);
    }

    if (membershipType) {
      whereConditions.push('membershipType = ?');
      queryParams.push(membershipType);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM members ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, queryParams);
    const totalMembers = countResult[0].total;

    // Get paginated members
    const membersQuery = `
      SELECT
        id, membershipNumber, firstName, middleName, lastName, email, phoneNumber,
        areaOfSpecialty, isActive, membershipType, hasAccount, joinedDate, expiryDate,
        createdAt, updatedAt
      FROM members
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [members] = await pool.query(membersQuery, queryParams);

    res.json({
      members,
      totalPages: Math.ceil(totalMembers / limit),
      currentPage: parseInt(page),
      totalMembers
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ message: 'Failed to fetch members', error: error.message });
  }
};

// Get single member by ID
const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const [members] = await pool.execute(
      'SELECT * FROM members WHERE id = ?',
      [id]
    );

    if (members.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json(members[0]);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ message: 'Failed to fetch member', error: error.message });
  }
};

// Update member
const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      middleName,
      lastName,
      email,
      phoneNumber,
      streetAddress,
      permanentAddress,
      areaOfSpecialty,
      mdcnRegistrationNumber,
      yearQualifiedMBBS,
      additionalQualificationMDCN,
      yearQualifiedUrologist,
      currentPractice,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinEmail,
      fellowshipCollege,
      fwacs,
      fmcs,
      facs,
      frcs,
      others,
      qualificationYear,
      additionalQualification,
      residencyTraining,
      foreignInstitution,
      conferenceAttended,
      membershipType,
      expiryDate
    } = req.body;

    // Check if member exists
    const [existingMember] = await pool.execute(
      'SELECT * FROM members WHERE id = ?',
      [id]
    );

    if (existingMember.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // If email is being changed, check for duplicates
    if (email && email !== existingMember[0].email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      const [duplicateCheck] = await pool.execute(
        'SELECT id FROM members WHERE email = ? AND id != ?',
        [email, id]
      );

      if (duplicateCheck.length > 0) {
        return res.status(400).json({ message: 'Member with this email already exists' });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (firstName !== undefined) { updateFields.push('firstName = ?'); updateValues.push(firstName); }
    if (middleName !== undefined) { updateFields.push('middleName = ?'); updateValues.push(middleName); }
    if (lastName !== undefined) { updateFields.push('lastName = ?'); updateValues.push(lastName); }
    if (email !== undefined) { updateFields.push('email = ?'); updateValues.push(email); }
    if (phoneNumber !== undefined) { updateFields.push('phoneNumber = ?'); updateValues.push(phoneNumber); }
    if (streetAddress !== undefined) { updateFields.push('streetAddress = ?'); updateValues.push(streetAddress); }
    if (permanentAddress !== undefined) { updateFields.push('permanentAddress = ?'); updateValues.push(permanentAddress); }
    if (areaOfSpecialty !== undefined) { updateFields.push('areaOfSpecialty = ?'); updateValues.push(areaOfSpecialty); }
    if (mdcnRegistrationNumber !== undefined) { updateFields.push('mdcnRegistrationNumber = ?'); updateValues.push(mdcnRegistrationNumber); }
    if (yearQualifiedMBBS !== undefined) { updateFields.push('yearQualifiedMBBS = ?'); updateValues.push(yearQualifiedMBBS); }
    if (additionalQualificationMDCN !== undefined) { updateFields.push('additionalQualificationMDCN = ?'); updateValues.push(additionalQualificationMDCN); }
    if (yearQualifiedUrologist !== undefined) { updateFields.push('yearQualifiedUrologist = ?'); updateValues.push(yearQualifiedUrologist); }
    if (currentPractice !== undefined) { updateFields.push('currentPractice = ?'); updateValues.push(currentPractice); }
    if (nextOfKinName !== undefined) { updateFields.push('nextOfKinName = ?'); updateValues.push(nextOfKinName); }
    if (nextOfKinPhone !== undefined) { updateFields.push('nextOfKinPhone = ?'); updateValues.push(nextOfKinPhone); }
    if (nextOfKinEmail !== undefined) { updateFields.push('nextOfKinEmail = ?'); updateValues.push(nextOfKinEmail); }
    if (fellowshipCollege !== undefined) { updateFields.push('fellowshipCollege = ?'); updateValues.push(fellowshipCollege); }
    if (fwacs !== undefined) { updateFields.push('fwacs = ?'); updateValues.push(fwacs ? 1 : 0); }
    if (fmcs !== undefined) { updateFields.push('fmcs = ?'); updateValues.push(fmcs ? 1 : 0); }
    if (facs !== undefined) { updateFields.push('facs = ?'); updateValues.push(facs ? 1 : 0); }
    if (frcs !== undefined) { updateFields.push('frcs = ?'); updateValues.push(frcs ? 1 : 0); }
    if (others !== undefined) { updateFields.push('others = ?'); updateValues.push(others ? 1 : 0); }
    if (qualificationYear !== undefined) { updateFields.push('qualificationYear = ?'); updateValues.push(qualificationYear); }
    if (additionalQualification !== undefined) { updateFields.push('additionalQualification = ?'); updateValues.push(additionalQualification); }
    if (residencyTraining !== undefined) { updateFields.push('residencyTraining = ?'); updateValues.push(residencyTraining); }
    if (foreignInstitution !== undefined) { updateFields.push('foreignInstitution = ?'); updateValues.push(foreignInstitution); }
    if (conferenceAttended !== undefined) { updateFields.push('conferenceAttended = ?'); updateValues.push(conferenceAttended); }
    if (membershipType !== undefined) { updateFields.push('membershipType = ?'); updateValues.push(membershipType); }
    if (expiryDate !== undefined) { updateFields.push('expiryDate = ?'); updateValues.push(expiryDate); }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Add updatedAt timestamp
    updateFields.push('updatedAt = NOW()');

    // Add member ID to values array
    updateValues.push(id);

    const updateQuery = `
      UPDATE members
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await pool.execute(updateQuery, updateValues);

    // Fetch updated member
    const [updatedMember] = await pool.execute(
      'SELECT * FROM members WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Member updated successfully',
      member: updatedMember[0]
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ message: 'Failed to update member', error: error.message });
  }
};

// Toggle member status (activate/deactivate)
const toggleMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Get current status
    const [member] = await pool.execute(
      'SELECT isActive FROM members WHERE id = ?',
      [id]
    );

    if (member.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Toggle status
    const newStatus = member[0].isActive ? 0 : 1;

    await pool.execute(
      'UPDATE members SET isActive = ?, updatedAt = NOW() WHERE id = ?',
      [newStatus, id]
    );

    res.json({
      message: `Member ${newStatus ? 'activated' : 'deactivated'} successfully`,
      isActive: newStatus === 1
    });
  } catch (error) {
    console.error('Error toggling member status:', error);
    res.status(500).json({ message: 'Failed to toggle member status', error: error.message });
  }
};

// Search members
const searchMembers = async (req, res) => {
  try {
    const { q = '' } = req.query;

    if (!q || q.trim() === '') {
      return res.json({ members: [] });
    }

    const searchPattern = `%${q}%`;

    const [members] = await pool.execute(
      `SELECT
        id, membershipNumber, firstName, middleName, lastName, email, phoneNumber,
        areaOfSpecialty, isActive, membershipType
      FROM members
      WHERE firstName LIKE ?
        OR lastName LIKE ?
        OR email LIKE ?
        OR membershipNumber LIKE ?
      ORDER BY lastName, firstName
      LIMIT 50`,
      [searchPattern, searchPattern, searchPattern, searchPattern]
    );

    res.json({ members });
  } catch (error) {
    console.error('Error searching members:', error);
    res.status(500).json({ message: 'Failed to search members', error: error.message });
  }
};

// Delete member and related records
const deleteMember = async (req, res) => {
  console.log(">>>>>>> DELETE MEMBER CALLED <<<<<<<<<");
  console.log("Params:", req.params);
  console.log("User:", req.user);
  console.log("Deleting member ID:", req.params.id);

  try {
    const { id } = req.params;

    // Get member details first
    const [member] = await pool.execute(
      'SELECT email, membershipNumber FROM members WHERE id = ?',
      [id]
    );

    if (member.length === 0) {
      console.log(">>>>>>> MEMBER NOT FOUND <<<<<<<<<");
      return res.status(404).json({ message: 'Member not found' });
    }

    const { email, membershipNumber } = member[0];

    console.log(">>>>>>> DELETING RELATED RECORDS <<<<<<<<<");
    
    // Delete from all related tables
    await pool.execute('DELETE FROM users WHERE email = ?', [email]);
    await pool.execute('DELETE FROM applications WHERE email = ?', [email]);
    await pool.execute('DELETE FROM members WHERE id = ?', [id]);

    console.log(">>>>>>> MEMBER DELETED SUCCESSFULLY <<<<<<<<<");
    
    res.json({
      message: 'Member deleted successfully',
      deletedMember: {
        id,
        email,
        membershipNumber
      }
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ message: 'Failed to delete member', error: error.message });
  }
};

module.exports = {
  getAllMembers,
  getMemberById,
  updateMember,
  toggleMemberStatus,
  searchMembers,
  deleteMember
};