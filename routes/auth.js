const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Resend } = require('resend');
const supabase = require('../config/supabase');

const resend = new Resend(process.env.RESEND_API_KEY);

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const cleanEmail = email.toLowerCase().trim();

        const { data: members, error: dbError } = await supabase
            .from('members')
            .select('*')
            .eq('email', cleanEmail)
            .limit(1);

        if (dbError) {
            console.error('Database lookup error:', dbError);
        }

        if (!members || members.length === 0) {
            return res.json({
                status: 'success',
                message: 'If an account exists with that email, a password reset link has been sent.'
            });
        }

        const member = members[0];

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000).toISOString();

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

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;

        const { error: resendError } = await resend.emails.send({
            from: 'NAUS Urology <noreply@nausurology.org>',
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

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
    const { email, token, newPassword } = req.body;

    try {
        if (!email || !token || !newPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const cleanEmail = email.toLowerCase().trim();

        const { data: members, error: fetchError } = await supabase
            .from('members')
            .select('*')
            .eq('email', cleanEmail)
            .limit(1);

        if (fetchError || !members || members.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        const member = members[0];

        if (member.reset_token !== token || !member.reset_token_expiry || new Date() > new Date(member.reset_token_expiry)) {
            return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
        }

        const { data: listUsersData, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            console.error('Error listing users:', listError);
            return res.status(500).json({ message: 'Internal server error.' });
        }

        let authUser = listUsersData.users.find(u => u.email.toLowerCase() === cleanEmail);

        if (!authUser) {
            // Bulk-imported user not in Supabase Auth yet — create them automatically!
            const { data: createdData, error: createError } = await supabase.auth.admin.createUser({
                email: cleanEmail,
                password: newPassword,
                email_confirm: true
            });

            if (createError) {
                console.error('Auth user creation error:', createError);
                return res.status(500).json({ message: 'Failed to initialize user account.' });
            }
            authUser = createdData.user;
        } else {
            // User exists — update their password directly
            const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authUser.id, {
                password: newPassword
            });

            if (updateAuthError) {
                console.error('Auth password update error:', updateAuthError);
                return res.status(500).json({ message: 'Failed to update password.' });
            }
        }

        // Clear out the reset token from the members table
        await supabase
            .from('members')
            .update({ 
                reset_token: null, 
                reset_token_expiry: null 
            })
            .eq('email', cleanEmail);

        return res.json({
            status: 'success',
            message: 'Password has been successfully reset. You can now log in.'
        });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

module.exports = router;