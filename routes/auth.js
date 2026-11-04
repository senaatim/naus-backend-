const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase');

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------- settings ----------
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // reset link lasts 1 hour
const MIN_PASSWORD_LENGTH = 6; // matches your reset page and Supabase's default
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

// ---------- helpers ----------
const normEmail = (v) => String(v || '').trim().toLowerCase();

// Escape % and _ so an email like john_doe@x.com doesn't act as a wildcard in ilike
const escapeLike = (v) => String(v).replace(/[\\%_]/g, '\\$&');

// Makes sure a base URL starts with https:// and has no trailing slash.
// A link without https:// is dead in Outlook, Yahoo and most email apps.
const normalizeBaseUrl = (value, fallback) => {
  let url = String(value || fallback || '').trim();
  if (!url) return fallback;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// Simple in-memory attempt counter (resets when the server restarts)
const makeCounter = (windowMs, max) => {
  const map = new Map();

  const entry = (key) => {
    const now = Date.now();
    let e = map.get(key);
    if (!e || e.reset <= now) {
      e = { count: 0, reset: now + windowMs };
      map.set(key, e);
    }
    return e;
  };

  setInterval(() => {
    const now = Date.now();
    for (const [key, e] of map) {
      if (e.reset <= now) map.delete(key);
    }
  }, windowMs).unref();

  return {
    isBlocked: (key) => entry(key).count >= max,
    add: (key) => {
      entry(key).count += 1;
    },
    clear: (key) => map.delete(key)
  };
};

const forgotAttempts = makeCounter(ATTEMPT_WINDOW_MS, 5); // reset emails per address
const resetAttempts = makeCounter(ATTEMPT_WINDOW_MS, 10); // bad reset attempts per address
const loginAttempts = makeCounter(ATTEMPT_WINDOW_MS, 10); // failed logins per address

const attemptKey = (email) => email.slice(0, 254);

// Finds a Supabase Auth user by email, across ALL pages of users
const findAuthUserByEmail = async (email) => {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const users = data?.users || [];
    const found = users.find((u) => String(u.email || '').toLowerCase() === email);
    if (found) return found;

    if (users.length < 1000) break;
  }
  return null;
};

// Sets the member's login password, creating the login first if it doesn't exist yet
const setAuthPassword = async (email, password) => {
  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (!createError) return;

  const msg = String(createError.message || '').toLowerCase();
  const alreadyExists =
    createError.code === 'email_exists' || msg.includes('already') || msg.includes('registered');

  if (!alreadyExists) throw createError;

  const existing = await findAuthUserByEmail(email);
  if (!existing) throw createError;

  const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password
  });
  if (updateError) throw updateError;
};

// A separate throwaway client for signing members in, so the main service client
// never picks up a member's session. Use the same env var names as config/supabase.js.
const makeSignInClient = () =>
  createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );

// Reset email: works in Outlook (button drawn for Word-based Outlook), Yahoo and Gmail,
// with the full link as plain text underneath in case buttons are blocked.
const buildResetEmail = (resetLink) => {
  const href = resetLink.replace(/&/g, '&amp;');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="padding: 40px 30px; color: #333333;">
          <h2 style="color: #1b4d3e; margin-top: 0;">Password Reset Request</h2>
          <p>You requested a password reset for your NAUS member account. Click the button below to set a new password:</p>

          <div style="margin: 30px 0; text-align: center;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="#1b4d3e">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Helvetica, Arial,sans-serif;font-size:16px;font-weight:bold;">Reset Password</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto;">
              <tr>
                <td align="center" bgcolor="#1b4d3e" style="border-radius: 5px; mso-padding-alt: 0px;">
                  <a href="${href}" target="_blank" rel="noopener noreferrer" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 14px 28px; display: inline-block; font-weight: bold; border: 1px solid #1b4d3e; border-radius: 5px; mso-padding-alt: 0px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
          </div>

          <p style="font-size: 14px; color: #666666;">
            If you didn't request this, you can safely ignore this email. This link will expire in 1 hour.
          </p>

          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">

          <p style="font-size: 13px; color: #777777; line-height: 1.5;">
            If the button above is not clickable, copy and paste this link into your browser address bar:<br>
            <a href="${href}" style="color: #1b4d3e; word-break: break-all;">${href}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// =====================================================
// FORGOT PASSWORD (also the first-time "set your password" step)
// =====================================================
router.post('/forgot-password', async (req, res) => {
  // Same response every time so nobody can discover which emails are members
  const generic = {
    status: 'success',
    message: 'If an account exists with that email, a password reset link has been sent.'
  };

  try {
    const cleanEmail = normEmail(req.body.email);

    if (!cleanEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const key = attemptKey(cleanEmail);
    if (forgotAttempts.isBlocked(key)) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    forgotAttempts.add(key);

    const { data: rows, error: dbError } = await supabase
      .from('members')
      .select('id, email, isactive')
      .ilike('email', escapeLike(cleanEmail))
      .limit(1);

    if (dbError) {
      console.error('Database lookup error:', dbError);
      return res.json(generic);
    }

    const member = rows && rows[0];

    if (!member || member.isactive === false) {
      return res.json(generic);
    }

    // The email carries the raw token; only its hash is stored
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    const { error: updateError } = await supabase
      .from('members')
      .update({
        reset_token: hashToken(resetToken),
        reset_token_expiry: tokenExpiry
      })
      .eq('id', member.id);

    if (updateError) {
      console.error('Failed to save reset token:', updateError);
      return res.json(generic);
    }

    const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL, 'https://nausurology.org');
    const resetLink =
      `${frontendUrl}/reset-password?token=${resetToken}` +
      `&email=${encodeURIComponent(member.email || cleanEmail)}`;

    const { error: resendError } = await resend.emails.send({
      from: 'NAUS Urology <noreply@nausurology.org>',
      to: [member.email || cleanEmail],
      subject: 'Reset Your Password - NAUS',
      html: buildResetEmail(resetLink)
    });

    if (resendError) {
      console.error('Resend error:', resendError);
    }

    return res.json(generic);
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.json(generic);
  }
});

// =====================================================
// RESET PASSWORD
// =====================================================
router.post('/reset-password', async (req, res) => {
  try {
    const cleanEmail = normEmail(req.body.email);
    const token = String(req.body.token || '');
    const newPassword = String(req.body.newPassword || '');

    if (!cleanEmail || !token || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const key = attemptKey(cleanEmail);
    if (resetAttempts.isBlocked(key)) {
      return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
    }

    const { data: rows, error: fetchError } = await supabase
      .from('members')
      .select('id, email, reset_token, reset_token_expiry, hasaccount')
      .ilike('email', escapeLike(cleanEmail))
      .limit(1);

    const invalid = { message: 'Reset link is invalid or has expired.' };
    const member = rows && rows[0];

    if (fetchError || !member || !member.reset_token || !member.reset_token_expiry) {
      resetAttempts.add(key);
      return res.status(400).json(invalid);
    }

    // Accepts the hashed token, and also a plain token saved before hashing was added
    // (those expire within an hour of this change)
    const tokenMatches =
      safeEqual(hashToken(token), member.reset_token) || safeEqual(token, member.reset_token);

    if (!tokenMatches || new Date() > new Date(member.reset_token_expiry)) {
      resetAttempts.add(key);
      return res.status(400).json(invalid);
    }

    // Set the password in Supabase Auth (creates the login for imported members who don't have one)
    await setAuthPassword(cleanEmail, newPassword);

    // Use up the token, and mark the account as created the first time
    const update = { reset_token: null, reset_token_expiry: null };
    if (!member.hasaccount) {
      update.hasaccount = true;
      update.accountcreated = new Date().toISOString();
    }

    await supabase.from('members').update(update).eq('id', member.id);

    resetAttempts.clear(key);

    return res.json({
      status: 'success',
      message: 'Password has been successfully reset. You can now log in.'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// =====================================================
// MEMBER LOGIN
// =====================================================
router.post('/member-login', async (req, res) => {
  try {
    const cleanEmail = normEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!cleanEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const key = attemptKey(cleanEmail);
    if (loginAttempts.isBlocked(key)) {
      return res
        .status(429)
        .json({ message: 'Too many failed attempts. Please try again in a few minutes.' });
    }

    // Sign in using Supabase Auth, on a separate client
    const signInClient = makeSignInClient();
    const { data, error } = await signInClient.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error || !data?.session) {
      loginAttempts.add(key);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Fetch extra member details from your custom table
    const { data: rows } = await supabase
      .from('members')
      .select('*')
      .ilike('email', escapeLike(cleanEmail))
      .limit(1);

    const memberData = rows && rows[0] ? { ...rows[0] } : null;

    if (memberData && memberData.isactive === false) {
      return res.status(403).json({ message: 'Your membership is not active. Please contact NAUS.' });
    }

    // Never send reset tokens to the browser
    if (memberData) {
      delete memberData.reset_token;
      delete memberData.reset_token_expiry;
    }

    loginAttempts.clear(key);

    return res.json({
      status: 'success',
      message: 'Login successful',
      session: data.session,
      member: memberData || data.user
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;