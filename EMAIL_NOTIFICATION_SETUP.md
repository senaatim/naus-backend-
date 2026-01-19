# Email Notification System - Setup Guide

## Overview
The email notification system has been successfully implemented! Users will now receive email notifications when their membership applications are approved or rejected by the admin panel.

## What Was Fixed

### 1. **Admin Routes Updated** (`routes/admin.js`)
- Added email notification integration to the application status update endpoint
- When status changes to "approved":
  - Generates unique membership number
  - Creates member account with temporary password
  - Sends approval email with login credentials
- When status changes to "rejected":
  - Sends rejection email with reason for rejection

### 2. **Email Templates Enhanced** (`services/emailService.js`)
- **Approval Email**: Professional HTML template with:
  - Membership number prominently displayed
  - Temporary password for first login
  - Direct login link button
  - Welcome message

- **Rejection Email**: Empathetic HTML template with:
  - Clear explanation
  - Rejection reason from admin notes
  - Contact information for appeals
  - Option to reapply

### 3. **Environment Variables Added**
New variables added to `.env`:
- `FRONTEND_URL` - URL of the frontend application (for login links)
- `CONTACT_EMAIL` - Contact email for user inquiries

## Configuration Required

### Step 1: Email Service Setup
Update these variables in your `.env` file:

```env
# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_actual_email@gmail.com
EMAIL_PASS=your_app_specific_password
EMAIL_FROM=noreply@naus.org.ng
CONTACT_EMAIL=info@naus.org.ng
FRONTEND_URL=http://localhost:3000
```

### Step 2: Gmail Setup (if using Gmail)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it "NAUS Backend"
   - Copy the 16-character password
   - Use this password in `EMAIL_PASS`

### Step 3: For Production
Update these values:
```env
FRONTEND_URL=https://yourdomain.com
EMAIL_FROM=noreply@naus.org.ng
CONTACT_EMAIL=info@naus.org.ng
```

## How It Works

### Approval Flow
1. Admin approves application in admin panel
2. System:
   - Generates membership number (e.g., NAUS/2026/001)
   - Creates temporary password
   - Creates member account with hashed password
   - Sends email to applicant with credentials
3. User receives email and can log in
4. User is prompted to change password on first login

### Rejection Flow
1. Admin rejects application with notes/reason
2. System sends rejection email with:
   - The reason provided by admin
   - Contact information for appeals
3. User receives professional rejection notification

## API Response

### Approval Response
```json
{
  "message": "Application approved successfully and email sent",
  "application": {
    "id": 123,
    "status": "approved",
    "membershipNumber": "NAUS/2026/001"
  },
  "emailSent": true
}
```

### Rejection Response
```json
{
  "message": "Application rejected and email sent",
  "application": {
    "id": 123,
    "status": "rejected"
  },
  "emailSent": true
}
```

## Error Handling
- If email fails to send, the system still updates the status
- Response indicates `emailSent: false`
- Error is logged to console for debugging
- Database transaction is not rolled back

## Testing

### Test Approval Email
```bash
# Make a PATCH request to approve an application
curl -X PATCH http://localhost:5000/api/admin/applications/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

### Test Rejection Email
```bash
# Make a PATCH request to reject an application
curl -X PATCH http://localhost:5000/api/admin/applications/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected", "notes": "Incomplete documentation provided"}'
```

## Troubleshooting

### Email Not Sending
1. Check `.env` file has correct email credentials
2. Verify Gmail app password is correct (not regular password)
3. Check console logs for error messages
4. Ensure port 587 is not blocked by firewall

### Common Issues
- **"Invalid login"**: Using regular password instead of app password
- **"Connection timeout"**: Port 587 blocked or incorrect EMAIL_HOST
- **"Self-signed certificate"**: Set `secure: false` for port 587

## Email Preview

### Approval Email Example
```
Subject: NAUS Membership Application Approved

Congratulations! Your NAUS Membership Application Has Been Approved

Dear Applicant,

We are pleased to inform you that your membership application has been
approved by the Executive Committee.

Your Membership Number: NAUS/2026/001
Temporary Password: xY9z2AbC

Please use this information to log in to your account and change your
password immediately.

[Click here to log in] (button)

Welcome to the Nigerian Association of Urological Surgeons!

Best regards,
NAUS Executive Committee
```

### Rejection Email Example
```
Subject: NAUS Membership Application Status Update

NAUS Membership Application Update

Dear Applicant,

Thank you for your interest in joining the Nigerian Association of
Urological Surgeons.

After careful review by our Executive Committee, we regret to inform
you that your membership application has not been approved at this time.

Reason: Incomplete documentation provided

If you believe this decision was made in error or would like further
clarification, please contact our office at info@naus.org.ng.

You may reapply for membership once you have addressed the concerns
outlined above.

Best regards,
NAUS Executive Committee
```

## Security Notes
- Temporary passwords are securely hashed before storage
- Passwords contain letters, numbers, and special characters
- Users must change password on first login
- Email credentials stored in environment variables (not in code)

## Support
For issues or questions, contact the development team or refer to the
Nodemailer documentation: https://nodemailer.com/
