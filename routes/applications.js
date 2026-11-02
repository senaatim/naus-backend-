const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase'); // Supabase client
const EmailService = require('../services/emailService');

// ADMIN LOGIN
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error || !admin) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (!admin.isactive && !admin.isActive) {
            return res.status(403).json({ message: "Account is inactive. Contact Super Admin." });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

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

// GET ALL APPLICATIONS (Mapped from lowercase DB columns to camelCase)
router.get('/admin/applications', async (req, res) => {
    try {
        const { data: apps, error } = await supabase
            .from('applications')
            .select('*')
            .order('createdat', { ascending: false });

        if (error) throw error;

        const formattedApps = (apps || []).map(app => ({
            ...app,
            firstName: app.firstname || app.firstName,
            lastName: app.lastname || app.lastName,
            membershipNumber: app.membershipnumber || app.membershipNumber,
            phoneNumber: app.phonenumber || app.phoneNumber,
            areaOfSpecialty: app.areaofspecialty || app.areaOfSpecialty
        }));

        res.json(formattedApps);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: "Error fetching applications" });
    }
});

// GET SINGLE APPLICATION BY ID (Mapped from lowercase DB columns to camelCase)
router.get('/admin/applications/:id', async (req, res) => {
    try {
        const { data: app, error } = await supabase
            .from('applications')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();

        if (error || !app) {
            return res.status(404).json({ message: "Application not found" });
        }

        const formattedApp = {
            id: app.id,
            status: app.status,
            firstName: app.firstname || app.firstName,
            middleName: app.middlename || app.middleName,
            lastName: app.lastname || app.lastName,
            email: app.email,
            phoneNumber: app.phonenumber || app.phoneNumber,
            areaOfSpecialty: app.areaofspecialty || app.areaOfSpecialty,
            mdcnRegistrationNumber: app.mdcnregistrationnumber || app.mdcnRegistrationNumber,
            yearQualifiedMBBS: app.yearqualifiedmbbs || app.yearQualifiedMBBS,
            streetAddress: app.streetaddress || app.streetAddress,
            permanentAddress: app.permanentaddress || app.permanentAddress,
            fellowshipCollege: app.fellowshipcollege || app.fellowshipCollege,
            fwacs: app.fwacs,
            fmcs: app.fmcs,
            facs: app.facs,
            frcs: app.frcs,
            others: app.others,
            qualificationYear: app.qualificationyear || app.qualificationYear,
            additionalQualification: app.additionalqualification || app.additionalQualification,
            residencyTraining: app.residencytraining || app.residencyTraining,
            foreignInstitution: app.foreigninstitution || app.foreignInstitution,
            mbbsCertificate: app.mbbscertificate || app.mbbsCertificate,
            fellowshipCertificate: app.fellowshipcertificate || app.fellowshipCertificate,
            documents: app.documents,
            membershipNumber: app.membershipnumber || app.membershipNumber
        };

        res.json(formattedApp);
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE APPLICATION STATUS
router.patch('/admin/applications/:id', async (req, res) => {
    try {
        const { status } = req.body;

        if (!['pending', 'approved', 'rejected', 'under_review'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const { data: app, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', req.params.id)
            .maybeSingle();

        if (fetchError || !app) {
            return res.status(404).json({ message: "Application not found" });
        }

        const oldStatus = app.status;

        // Update application status
        await supabase
            .from('applications')
            .update({ status })
            .eq('id', req.params.id);

        if (status === 'approved' && oldStatus !== 'approved') {
            const membershipNumber = `NAUS-${Math.floor(100000 + Math.random() * 900000)}`;
            const tempPassword = Math.random().toString(36).slice(-8) + 'Temp!';
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            // Create Supabase Auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: app.email,
                password: tempPassword,
                email_confirm: true
            });

            if (authError) {
                console.error('Auth User Creation Error:', authError);
            }

            const userId = authData?.user?.id;

            // Insert into members table
            await supabase.from('members').insert([{
                id: userId,
                membershipnumber: membershipNumber,
                firstname: app.firstname || app.firstName,
                lastname: app.lastname || app.lastName,
                email: app.email,
                membershiptype: 'new',
                hasaccount: true,
                isactive: true
            }]);

            // Update application with membership number
            await supabase
                .from('applications')
                .update({ membershipnumber: membershipNumber })
                .eq('id', req.params.id);

            await EmailService.sendApprovalEmail(app.email, membershipNumber, tempPassword);

            return res.json({
                message: "Application approved successfully and email sent",
                application: { id: app.id, status, membershipNumber },
                emailSent: true
            });
        }

        res.json({ message: "Application status updated successfully", application: { id: app.id, status } });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;