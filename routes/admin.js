const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Admin, Application } = require('../models');
const EmailService = require('../services/emailService');
const MemberModel = require('../models/MemberModel');

// ADMIN LOGIN - CHANGED
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find admin by email
        const admin = await Admin.findOne({ where: { email } });

        if (!admin) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!admin.isActive) {
            return res.status(403).json({ message: "Account is inactive. Contact Super Admin." });
        }

        // Compare password with hashed password in DB
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: admin.id, role: admin.role },
            process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_production',
            { expiresIn: '1d' }
        );

        res.json({
            status: 'success',
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('Admin Login Error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET ALL APPLICATIONS - CHANGED
router.get('/admin/applications', async (req, res) => {
    try {
        const apps = await Application.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(apps);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: "Error fetching applications" });
    }
});

// GET SINGLE APPLICATION BY ID - CHANGED
router.get('/admin/applications/:id', async (req, res) => {
    try {
        const app = await Application.findByPk(req.params.id);
        if (!app) return res.status(404).json({ message: "Application not found" });
        
        res.json(app);
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE APPLICATION STATUS - CHANGED
router.patch('/admin/applications/:id', async (req, res) => {
    try {
        const { status, notes } = req.body;

        // Validate status
        if (!['pending', 'approved', 'rejected', 'under_review'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const app = await Application.findByPk(req.params.id);
        if (!app) return res.status(404).json({ message: "Application not found" });

        const oldStatus = app.status;

        // Update status
        await app.update({ status });

        // Handle email notifications based on status change
        if (status === 'approved' && oldStatus !== 'approved') {
            // Generate membership number
            let membershipNumber = await MemberModel.generateMembershipNumber();

            // Generate temporary password
            const tempPassword = Math.random().toString(36).slice(-8) + 'Temp!';
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            // Create member record
            const memberData = {
                membershipNumber: membershipNumber,
                firstName: app.firstName,
                middleName: app.middleName,
                lastName: app.lastName,
                areaOfSpecialty: app.areaOfSpecialty,
                phoneNumber: app.phoneNumber,
                email: app.email,
                streetAddress: app.streetAddress,
                permanentAddress: app.permanentAddress,
                mdcnRegistrationNumber: app.mdcnRegistrationNumber,
                yearQualifiedMBBS: app.yearQualifiedMBBS,
                additionalQualificationMDCN: app.additionalQualificationMDCN,
                yearQualifiedUrologist: app.yearQualifiedUrologist,
                currentPractice: app.currentPractice,
                nextOfKinName: app.nextOfKinName,
                nextOfKinPhone: app.nextOfKinPhone,
                nextOfKinEmail: app.nextOfKinEmail,
                fellowshipCollege: app.fellowshipCollege,
                fwacs: app.fwacs,
                fmcs: app.fmcs,
                facs: app.facs,
                frcs: app.frcs,
                others: app.others,
                qualificationYear: app.qualificationYear,
                additionalQualification: app.additionalQualification,
                residencyTraining: app.residencyTraining,
                foreignInstitution: app.foreignInstitution,
                conferenceAttended: app.conferenceAttended,
                declaration: app.declaration,
                date: app.date,
                mbbsCertificate: app.mbbsCertificate,
                fellowshipCertificate: app.fellowshipCertificate,
                hasAccount: true,
                accountCreated: new Date(),
                membershipType: 'new',
                password: hashedPassword
            };

            try {
                const { pool } = require('../config/database');

                // Check if member already exists
                const existingMember = await MemberModel.findByEmail(app.email);
                if (existingMember) {
                    // Use existing membership number if available
                    if (existingMember.membershipNumber) {
                        membershipNumber = existingMember.membershipNumber;
                    }
                    // Update existing member record
                    const conn = await pool.getConnection();
                    try {
                        await conn.execute(`
                            UPDATE members
                            SET hasAccount = 1, accountCreated = NOW()
                            WHERE email = ?
                        `, [app.email]);
                    } finally {
                        conn.release();
                    }
                } else {
                    // Create new member account
                    await MemberModel.create(memberData);
                }

                // Create or update user account for authentication
                const connection = await pool.getConnection();
                try {
                    // Check if user already exists
                    const [existingUsers] = await connection.execute(
                        'SELECT id FROM users WHERE email = ?',
                        [app.email]
                    );

                    if (existingUsers.length > 0) {
                        // Update existing user
                        await connection.execute(`
                            UPDATE users
                            SET membershipNumber = ?, password = ?, firstName = ?, lastName = ?, isActive = 1
                            WHERE email = ?
                        `, [membershipNumber, hashedPassword, app.firstName, app.lastName, app.email]);
                    } else {
                        // Create new user
                        await connection.execute(`
                            INSERT INTO users (membershipNumber, email, password, firstName, lastName, role, isActive)
                            VALUES (?, ?, ?, ?, ?, 'member', 1)
                        `, [membershipNumber, app.email, hashedPassword, app.firstName, app.lastName]);
                    }
                } finally {
                    connection.release();
                }

                // Update application with membership number
                await app.update({ membershipNumber: membershipNumber });

                // Send approval email with credentials
                await EmailService.sendApprovalEmail(app.email, membershipNumber, tempPassword);

                console.log(`✅ Approval email sent to ${app.email} with membership number: ${membershipNumber}`);
            } catch (emailError) {
                console.error('Error in approval process:', emailError);
                // Don't fail the entire request if email fails
                return res.json({
                    message: "Application approved but email notification failed",
                    application: {
                        id: app.id,
                        status: app.status,
                        membershipNumber: membershipNumber
                    },
                    emailSent: false
                });
            }

            return res.json({
                message: "Application approved successfully and email sent",
                application: {
                    id: app.id,
                    status: app.status,
                    membershipNumber: membershipNumber
                },
                emailSent: true
            });
        } else if (status === 'rejected' && oldStatus !== 'rejected') {
            // Deactivate user account if it exists (in case it was previously approved)
            try {
                const { pool } = require('../config/database');
                const connection = await pool.getConnection();
                try {
                    await connection.execute(
                        'UPDATE users SET isActive = 0 WHERE email = ?',
                        [app.email]
                    );
                    await connection.execute(
                        'UPDATE members SET hasAccount = 0 WHERE email = ?',
                        [app.email]
                    );
                    console.log(`✅ Deactivated account for ${app.email}`);
                } finally {
                    connection.release();
                }
            } catch (deactivateError) {
                console.error('Error deactivating account:', deactivateError);
                // Continue with rejection even if deactivation fails
            }

            // Send rejection email
            try {
                const rejectionReason = notes || 'Application did not meet the required criteria';
                await EmailService.sendRejectionEmail(app.email, rejectionReason);
                console.log(`✅ Rejection email sent to ${app.email}`);

                return res.json({
                    message: "Application rejected and email sent",
                    application: {
                        id: app.id,
                        status: app.status
                    },
                    emailSent: true
                });
            } catch (emailError) {
                console.error('Error sending rejection email:', emailError);
                return res.json({
                    message: "Application rejected but email notification failed",
                    application: {
                        id: app.id,
                        status: app.status
                    },
                    emailSent: false
                });
            }
        }

        // For other status changes (pending, under_review), just update without email
        res.json({
            message: "Application status updated successfully",
            application: {
                id: app.id,
                status: app.status
            }
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: error.message });
    }
});

// CREATE ACCOUNT FOR EXISTING MEMBER - CHANGED
router.post('/admin/existing-members', async (req, res) => {
    try {
        const { firstName, lastName, email, membershipNumber } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !membershipNumber) {
            return res.status(400).json({
                message: 'First name, last name, email, and membership number are required'
            });
        }

        // Check if email already exists
        const { pool } = require('../config/database');
        const connection = await pool.getConnection();

        try {
            // Check for existing user with same email
            const [existingUsers] = await connection.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({
                    message: 'A user with this email already exists'
                });
            }

            // Check for existing member with same membership number
            const [existingMembers] = await connection.execute(
                'SELECT id FROM members WHERE membershipNumber = ?',
                [membershipNumber]
            );

            if (existingMembers.length > 0) {
                return res.status(400).json({
                    message: 'A member with this membership number already exists'
                });
            }

            // Generate temporary password
            const tempPassword = Math.random().toString(36).slice(-8) + 'Temp!';
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            // Create member record with minimal info
            await connection.execute(`
                INSERT INTO members (
                    membershipNumber, firstName, lastName, email,
                    hasAccount, accountCreated, membershipType
                ) VALUES (?, ?, ?, ?, 1, NOW(), 'existing')
            `, [membershipNumber, firstName, lastName, email]);

            // Create user record for authentication
            await connection.execute(`
                INSERT INTO users (membershipNumber, email, password, firstName, lastName, role, isActive)
                VALUES (?, ?, ?, ?, ?, 'member', 1)
            `, [membershipNumber, email, hashedPassword, firstName, lastName]);

            // Create application record so it appears in admin panel
            await connection.execute(`
                INSERT INTO applications (
                    firstName, lastName, email, membershipNumber,
                    status, date
                ) VALUES (?, ?, ?, ?, 'approved', NOW())
            `, [firstName, lastName, email, membershipNumber]);

            // Send welcome email
            const EmailService = require('../services/emailService');
            const emailSent = await EmailService.sendWelcomeEmail(
                email, firstName, lastName, membershipNumber, tempPassword
            );

            console.log(`✅ Created account for existing member: ${firstName} ${lastName} (${membershipNumber})`);

            res.status(201).json({
                message: 'Member account created successfully',
                member: {
                    firstName,
                    lastName,
                    email,
                    membershipNumber
                },
                emailSent
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error creating existing member:', error);

        // Handle duplicate entry errors
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                message: 'A member with this email or membership number already exists'
            });
        }

        res.status(500).json({
            message: 'Failed to create member account',
            error: error.message
        });
    }
});

// LIST ALL EXISTING MEMBERS - CHANGED
router.get('/admin/existing-members', async (req, res) => {
    try {
        const { pool } = require('../config/database');
        const connection = await pool.getConnection();

        try {
            const [members] = await connection.execute(`
                SELECT m.*, u.isActive as accountActive
                FROM members m
                LEFT JOIN users u ON m.membershipNumber = u.membershipNumber
                WHERE m.membershipType = 'existing'
                ORDER BY m.createdAt DESC
            `);

            res.json(members);
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error fetching existing members:', error);
        res.status(500).json({ message: 'Failed to fetch existing members' });
    }
});

module.exports = router;