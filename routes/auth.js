const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Resend } = require('resend');
const supabase = require('../config/supabase');

const resend = new Resend(process.env.RESEND_API_KEY);

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

// FORGOT PASSWORD (Using Resend Alone)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const cleanEmail = email.toLowerCase().trim();

        // 1. Check if member exists in your members table
        const { data: members, error: dbError } = await supabase
            .from('members')
            .select('*')
            .eq('email', cleanEmail)
            .limit(1);

        if (dbError) {
            console.error('Database lookup error:', dbError);
        }

        // Always return success to prevent email enumeration (security best practice)
        if (!members || members.length === 0) {
            return res.json({
                status: 'success',
                message: 'If an account exists with that email, a password reset link has been sent.'
            });
        }

        const member = members[0];

        // 2. Generate secure token and 1-hour expiration
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000).toISOString();

        // 3. Save token to the members table
        const { error: updateError } = await supabase
            .from('members')
            .update({ 
                reset_token: resetToken, 
                reset_token_expiry: tokenExpiry 
            })
            .eq('email', cleanEmail);

        if (updateError) {
            console.error('Failed to save reset token:', updateError);
            return res.status(500).json({ message: "Internal server error" });
        }

        // 4. Construct frontend reset link
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;

        // 5. Send email via Resend alone
        const { error: resendError } = await resend.emails.send({
            from: 'NAUS Urology <noreply@nausurology.org>', // Make sure this domain is verified in Resend
            to: [cleanEmail],
            subject: 'Reset Your Password - NAUS',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1b4d3e;">Password Reset Request</h2>
                  <p>You requested a password reset for your NAUS member account. Click the button below to set a new password:</p>
                  <a href="${resetLink}" style="background-color: #1b4d3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold;">Reset Password</a>
                  <p style="font-size: 0.9rem; color: #666;">If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.</p>
                </div>
            `
        });

        if (resendError) {
            console.error('Resend error:', resendError);
            return res.status(500).json({ message: 'Failed to send reset email.' });
        }

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