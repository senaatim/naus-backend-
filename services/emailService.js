class EmailService {
  static async sendEmail(to, subject, html) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'NAUS <noreply@nausurology.org>',
          to: to,
          subject: subject,
          html: html
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Resend error:', data);
        return false;
      }

      console.log('✅ Email sent successfully to:', to);
      console.log('📧 Email ID:', data.id);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(email, firstName, lastName, membershipNumber, tempPassword) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://nausurology.org';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          Welcome to the Nigerian Association of Urological Surgeons
        </h2>
        <p>Dear Dr. ${firstName} ${lastName},</p>
        <p>Your NAUS member account has been created. You can now access your member dashboard to update your profile and manage your membership.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Your Login Credentials:</h3>
          <p><strong>Membership Number:</strong> ${membershipNumber}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>

        <p style="color: #dc3545; font-weight: bold;">
          Please change your password after your first login for security.
        </p>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${frontendUrl}/member-login" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Login to Your Account
          </a>
        </div>

        <p>After logging in, please complete your profile by adding:</p>
        <ul>
          <li>Phone number and address</li>
          <li>MDCN registration details</li>
          <li>Qualifications and certifications</li>
          <li>Next of kin information</li>
          <li>Required certificates (MBBS & Fellowship)</li>
        </ul>

        <p>If you have any questions, please contact us at ${process.env.CONTACT_EMAIL || 'urologistsinnigeria@gmail.com'}</p>
        <p>Best regards,<br>NAUS Administration</p>
      </div>
    `;

    return await this.sendEmail(email, 'Welcome to NAUS - Your Account Has Been Created', html);
  }

  static async sendApprovalEmail(email, membershipNumber, tempPassword) {
    const loginUrl = process.env.FRONTEND_URL || 'https://nausurology.org';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Congratulations! Your NAUS Membership Application Has Been Approved</h2>
        <p>Dear Applicant,</p>
        <p>We are pleased to inform you that your membership application has been approved by the Executive Committee.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Your Membership Number:</strong> <span style="color: #007bff; font-size: 18px;">${membershipNumber}</span></p>
          <p><strong>Temporary Password:</strong> <span style="color: #28a745; font-size: 16px;">${tempPassword}</span></p>
        </div>

        <p>Please use this information to log in to your account and <strong>change your password immediately</strong>.</p>

        <p style="margin: 30px 0; text-align: center;">
          <a href="${loginUrl}/member-login" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Click here to log in</a>
        </p>

        <p style="color: #666; font-style: italic;">Welcome to the Nigerian Association of Urological Surgeons!</p>
        <br>
        <p>Best regards,<br>
        <strong>NAUS Executive Committee</strong></p>
      </div>
    `;

    return await this.sendEmail(email, 'NAUS Membership Application Approved', html);
  }

  static async sendRejectionEmail(email, reason = 'Application did not meet requirements') {
    const contactEmail = process.env.CONTACT_EMAIL || 'urologistsinnigeria@gmail.com';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">NAUS Membership Application Update</h2>
        <p>Dear Applicant,</p>
        <p>Thank you for your interest in joining the Nigerian Association of Urological Surgeons.</p>
        <p>After careful review by our Executive Committee, we regret to inform you that your membership application has not been approved at this time.</p>

        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p style="margin: 0;"><strong>Reason:</strong> ${reason}</p>
        </div>

        <p>If you believe this decision was made in error or would like further clarification, please contact our office at <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
        <p>You may reapply for membership once you have addressed the concerns outlined above.</p>
        <br>
        <p>Best regards,<br>
        <strong>NAUS Executive Committee</strong></p>
      </div>
    `;

    return await this.sendEmail(email, 'NAUS Membership Application Status Update', html);
  }

  static async sendContactEmail(name, email, subject, message) {
    const contactEmail = process.env.CONTACT_EMAIL || 'urologistsinnigeria@gmail.com';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #007bff; padding-bottom: 10px;">New Contact Form Submission</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject || 'No Subject'}</p>
        </div>
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h3 style="color: #2c3e50; margin-top: 0;">Message:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          This message was sent from the NAUS website contact form.
        </p>
      </div>
    `;

    return await this.sendEmail(contactEmail, `Contact Form: ${subject || 'No Subject'}`, html);
  }

  static async sendPasswordResetEmail(email, resetToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://nausurology.org';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          Password Reset Request
        </h2>
        <p>Hello,</p>
        <p>We received a request to reset your password for your NAUS member account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour for security reasons.
        </p>
        <p style="color: #666; font-size: 14px;">
          If you did not request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #007bff;">${resetUrl}</a>
        </p>
        <br>
        <p>Best regards,<br>
        <strong>NAUS Security Team</strong></p>
      </div>
    `;

    return await this.sendEmail(email, 'NAUS - Password Reset Request', html);
  }

  static async sendPasswordChangedEmail(email) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Changed Successfully</h2>
        <p>Hello,</p>
        <p>Your password has been successfully changed.</p>
        <p>If you did not make this change, please contact us immediately.</p>
        <br>
        <p>Best regards,<br>
        NAUS Security Team</p>
      </div>
    `;

    return await this.sendEmail(email, 'Password Changed Successfully', html);
  }
}

module.exports = EmailService;
