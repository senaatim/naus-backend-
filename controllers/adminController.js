const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const MemberModel = require('../models/MemberModel');

const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find admin by email
        const [rows] = await pool.execute(
            'SELECT * FROM admins WHERE email = ? AND isActive = 1',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const admin = rows[0];

        // Compare password with hashed password in DB
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: admin.role },
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
        res.status(500).json({ error: "Internal server error" });
    }
};

const getApplications = async (req, res) => {
    try {
        const [apps] = await pool.execute(`
            SELECT * FROM applications 
            ORDER BY createdAt DESC
        `);
        res.json(apps);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: "Error fetching applications" });
    }
};

const getApplicationById = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM applications WHERE id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) return res.status(404).json({ error: "Application not found" });
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: error.message });
    }
};

const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        // Validate status
        if (!['pending', 'approved', 'rejected', 'under_review'].includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }
        
        // Get current application to check previous status
        const [currentAppRows] = await pool.execute(
            'SELECT * FROM applications WHERE id = ?',
            [req.params.id]
        );
        
        if (currentAppRows.length === 0) {
            return res.status(404).json({ error: "Application not found" });
        }
        
        const currentApp = currentAppRows[0];
        const oldStatus = currentApp.status;
        
        // Update status
        const [result] = await pool.execute(
            'UPDATE applications SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Application not found" });
        }
        
        // If application was approved and previously pending, create member account
        if (status === 'approved' && oldStatus === 'pending') {
            await createMemberAccount(currentApp);
        }
        
        res.json({ 
            message: "Application status updated successfully",
            application: {
                id: currentApp.id,
                status: status
            }
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: error.message });
    }
};

// Function to create member account when application is approved
const createMemberAccount = async (application) => {
    try {
        // Generate a default password
        const defaultPassword = generateDefaultPassword();
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        // Generate unique membership number
        const membershipNumber = await MemberModel.generateMembershipNumber();
        
        // Create member data object
        const memberData = {
            membershipNumber: membershipNumber,
            firstName: application.firstName,
            middleName: application.middleName,
            lastName: application.lastName,
            areaOfSpecialty: application.areaOfSpecialty,
            phoneNumber: application.phoneNumber,
            email: application.email,
            streetAddress: application.streetAddress,
            permanentAddress: application.permanentAddress,
            mdcnRegistrationNumber: application.mdcnRegistrationNumber,
            yearQualifiedMBBS: application.yearQualifiedMBBS,
            additionalQualificationMDCN: application.additionalQualificationMDCN,
            yearQualifiedUrologist: application.yearQualifiedUrologist,
            currentPractice: application.currentPractice,
            nextOfKinName: application.nextOfKinName,
            nextOfKinPhone: application.nextOfKinPhone,
            nextOfKinEmail: application.nextOfKinEmail,
            fellowshipCollege: application.fellowshipCollege,
            fwacs: application.fwacs,
            fmcs: application.fmcs,
            facs: application.facs,
            frcs: application.frcs,
            others: application.others,
            qualificationYear: application.qualificationYear,
            additionalQualification: application.additionalQualification,
            residencyTraining: application.residencyTraining,
            foreignInstitution: application.foreignInstitution,
            conferenceAttended: application.conferenceAttended,
            declaration: application.declaration,
            date: application.date,
            mbbsCertificate: application.mbbsCertificate,
            fellowshipCertificate: application.fellowshipCertificate,
            hasAccount: true,
            accountCreated: new Date(),
            membershipType: 'new',
            password: hashedPassword
        };
        
        // Create member account
        await MemberModel.create(memberData);
        
        // Send notification email with default password
        await sendApprovalNotification(memberData, defaultPassword);
        
        console.log(`Member account created for ${memberData.email} with membership number: ${membershipNumber}`);
        
        return membershipNumber;
    } catch (error) {
        console.error('Error creating member account:', error);
        throw error;
    }
};

// Generate a default password
const generateDefaultPassword = () => {
    // Generate a random 8-character password with letters and numbers
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Send approval notification to user
const sendApprovalNotification = async (memberData, defaultPassword) => {
    try {
        // In a real implementation, you would use a mail service like nodemailer
        console.log(`Sending approval notification to: ${memberData.email}`);
        console.log(`Membership Number: ${memberData.membershipNumber}`);
        console.log(`Default Password: ${defaultPassword}`);
        
        // TODO: Implement actual email sending
        // Example with nodemailer:
        /*
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
            // your email configuration
        });
        
        const mailOptions = {
            from: 'noreply@naus.org.ng',
            to: memberData.email,
            subject: 'NAUS Membership Approved',
            html: `
                <h2>Congratulations! Your NAUS membership has been approved.</h2>
                <p><strong>Membership Number:</strong> ${memberData.membershipNumber}</p>
                <p><strong>Default Password:</strong> ${defaultPassword}</p>
                <p>Please login to your dashboard and change your password.</p>
                <a href="http://localhost:3000/login">Login to Dashboard</a>
            `
        };
        
        await transporter.sendMail(mailOptions);
        */
        
    } catch (error) {
        console.error('Error sending approval notification:', error);
    }
};

module.exports = {
    loginAdmin,
    getApplications,
    getApplicationById,
    updateApplicationStatus
};