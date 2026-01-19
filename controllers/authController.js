const UserModel = require('../models/UserModel');
const MemberModel = require('../models/MemberModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          membershipNumber: user.membershipNumber
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async createAccount(req, res) {
    try {
      const { membershipNumber, email, password, firstName, lastName } = req.body;

      // Validate input
      if (!membershipNumber || !email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Check if membership number exists and is valid
      const member = await MemberModel.findByMembershipNumber(membershipNumber);
      if (!member) {
        return res.status(400).json({ message: 'Invalid membership number' });
      }

      // Check if user already has an account
      if (member.hasAccount) {
        return res.status(400).json({ message: 'Account already exists for this membership number' });
      }

      // Check if email already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user account
      const userId = await UserModel.create({
        membershipNumber,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'member'
      });

      // Update member account status
      await MemberModel.updateAccountStatus(membershipNumber, true);

      res.status(201).json({ message: 'Account created successfully' });

    } catch (error) {
      console.error('Create account error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get user
      const user = await UserModel.findByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updated = await UserModel.updatePassword(userId, hashedNewPassword);
      if (!updated) {
        return res.status(400).json({ message: 'Failed to update password' });
      }

      // Send password change confirmation email
      const EmailService = require('../services/emailService'); // Moved here
      await EmailService.sendPasswordChangedEmail(user.email);

      res.json({ message: 'Password changed successfully' });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = AuthController;