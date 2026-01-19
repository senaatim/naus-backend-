// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const EmailService = require('../services/emailService');

// MEMBER LOGIN
router.post('/member-login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Find user by email
        const connection = await pool.getConnection();
        let user;
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM users WHERE email = ? AND role = ?',
                [email, 'member']
            );
            user = rows[0];
        } finally {
            connection.release();
        }

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Account is inactive. Please contact support." });
        }

        // Compare password with hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Update last login and login count
        const connection2 = await pool.getConnection();
        try {
            await connection2.execute(
                'UPDATE users SET lastLogin = NOW(), loginCount = loginCount + 1 WHERE id = ?',
                [user.id]
            );
        } finally {
            connection2.release();
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user.id, membershipNumber: user.membershipNumber, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_production',
            { expiresIn: '7d' }
        );

        res.json({
            status: 'success',
            token,
            user: {
                id: user.id,
                membershipNumber: user.membershipNumber,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Member Login Error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// This becomes /api/auth/register because of the prefix in server.js
router.post('/register', async (req, res) => {
    try {
        // Your logic to save to MySQL here...
        res.status(201).json({ status: 'success', message: 'User registered' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// FORGOT PASSWORD - Send reset email
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const connection = await pool.getConnection();
        let user;
        try {
            const [rows] = await connection.execute(
                'SELECT id, email, firstName FROM users WHERE email = ? AND role = ?',
                [email, 'member']
            );
            user = rows[0];
        } finally {
            connection.release();
        }

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({
                status: 'success',
                message: 'If an account exists with that email, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

        // Store reset token in database
        const connection2 = await pool.getConnection();
        try {
            await connection2.execute(
                'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?',
                [resetTokenHash, resetExpires, user.id]
            );
        } finally {
            connection2.release();
        }

        // Send reset email
        await EmailService.sendPasswordResetEmail(user.email, resetToken);

        res.json({
            status: 'success',
            message: 'If an account exists with that email, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// RESET PASSWORD - Verify token and set new password
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    try {
        if (!token || !password) {
            return res.status(400).json({ message: "Token and new password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // Hash the token to compare with stored hash
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const connection = await pool.getConnection();
        let user;
        try {
            const [rows] = await connection.execute(
                'SELECT id, email FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > NOW()',
                [resetTokenHash]
            );
            user = rows[0];
        } finally {
            connection.release();
        }

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token. Please request a new password reset." });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and clear reset token
        const connection2 = await pool.getConnection();
        try {
            await connection2.execute(
                'UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?',
                [hashedPassword, user.id]
            );
        } finally {
            connection2.release();
        }

        // Send confirmation email
        await EmailService.sendPasswordChangedEmail(user.email);

        res.json({
            status: 'success',
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;