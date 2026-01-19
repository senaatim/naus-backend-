const express = require('express');
const router = express.Router();
const EmailService = require('../services/emailService');

// POST /api/contact - Submit contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Send the contact email
    const emailSent = await EmailService.sendContactEmail(name, email, subject, message);

    if (emailSent) {
      res.status(200).json({
        success: true,
        message: 'Your message has been sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send message. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending your message'
    });
  }
});

module.exports = router;
