const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// MEMBER LOGIN
router.post('/member-login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Use Supabase Auth sign-in
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ message: error.message });
        }

        // Fetch member profile details
        const { data: memberProfile } = await supabase
            .from('members')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

        res.json({
            status: 'success',
            token: data.session.access_token,
            user: {
                id: data.user.id,
                email: data.user.email,
                ...memberProfile
            }
        });

    } catch (error) {
        console.error('Member Login Error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
        });

        // Always return success to prevent email enumeration
        res.json({
            status: 'success',
            message: 'If an account exists with that email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;