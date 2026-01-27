const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Admin } = require('../models');
const EmailService = require('../services/emailService');

// Get all admins with pagination and search
const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? {
          [require('sequelize').Op.or]: [
            { name: { [require('sequelize').Op.like]: `%${search}%` } },
            { email: { [require('sequelize').Op.like]: `%${search}%` } }
          ]
        }
      : {};

    const { count, rows: admins } = await Admin.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      admins,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalAdmins: count
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ message: 'Failed to fetch admins', error: error.message });
  }
};

// Get single admin by ID
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({ message: 'Failed to fetch admin', error: error.message });
  }
};

// Generate a secure random password
const generateDefaultPassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
};

// Create new admin
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role = 'membership_admin' } = req.body;

    // Validate required fields (password is now optional - will be auto-generated)
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    // Use provided password or generate a default one
    const tempPassword = password || generateDefaultPassword();

    // Hash password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create admin
    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true
    });

    // Send welcome email with credentials
    try {
      await EmailService.sendAdminWelcomeEmail(email, name, role, tempPassword);
      console.log(`✅ Welcome email sent to new admin: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError);
      // Don't fail the request if email fails - admin is still created
    }

    // Return admin without password
    const adminData = newAdmin.toJSON();
    delete adminData.password;

    res.status(201).json({
      message: 'Admin created successfully. Login credentials have been sent to their email.',
      admin: adminData
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Failed to create admin', error: error.message });
  }
};

// Update admin
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    const admin = await Admin.findByPk(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // If email is being changed, check for duplicates
    if (email && email !== admin.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      const existingAdmin = await Admin.findOne({ where: { email } });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Admin with this email already exists' });
      }
    }

    // Update admin fields
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (role) admin.role = role;
    if (typeof isActive === 'boolean') admin.isActive = isActive;

    await admin.save();

    // Return admin without password
    const adminData = admin.toJSON();
    delete adminData.password;

    res.json({
      message: 'Admin updated successfully',
      admin: adminData
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ message: 'Failed to update admin', error: error.message });
  }
};

// Delete admin (soft delete)
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const admin = await Admin.findByPk(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Soft delete by setting isActive to false
    admin.isActive = false;
    await admin.save();

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ message: 'Failed to delete admin', error: error.message });
  }
};

// Get current admin profile
const getCurrentAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

// Update current admin profile
const updateCurrentAdmin = async (req, res) => {
  try {
    const { name, email } = req.body;

    const admin = await Admin.findByPk(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // If email is being changed, check for duplicates
    if (email && email !== admin.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      const existingAdmin = await Admin.findOne({ where: { email } });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Admin with this email already exists' });
      }
    }

    // Update profile
    if (name) admin.name = name;
    if (email) admin.email = email;

    await admin.save();

    // Return admin without password
    const adminData = admin.toJSON();
    delete adminData.password;

    res.json({
      message: 'Profile updated successfully',
      admin: adminData
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const admin = await Admin.findByPk(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getCurrentAdmin,
  updateCurrentAdmin,
  changePassword
};
