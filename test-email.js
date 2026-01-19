require('dotenv').config();
const EmailService = require('./services/emailService');

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('---');

  // Test approval email
  console.log('\nSending test approval email...');
  const approvalResult = await EmailService.sendApprovalEmail(
    'urologistsinnigeria@gmail.com', // Send to your own email for testing
    'NAUS/2026/TEST001',
    'TestPass123!'
  );

  if (approvalResult) {
    console.log('✓ Approval email sent successfully!');
    console.log('Check urologistsinnigeria@gmail.com inbox');
  } else {
    console.log('✗ Failed to send approval email');
  }

  // Test rejection email
  console.log('\nSending test rejection email...');
  const rejectionResult = await EmailService.sendRejectionEmail(
    'urologistsinnigeria@gmail.com', // Send to your own email for testing
    'Incomplete documentation provided for testing purposes'
  );

  if (rejectionResult) {
    console.log('✓ Rejection email sent successfully!');
    console.log('Check urologistsinnigeria@gmail.com inbox');
  } else {
    console.log('✗ Failed to send rejection email');
  }

  console.log('\n--- Email Test Complete ---');
  process.exit(0);
}

testEmail().catch(error => {
  console.error('Error during email test:', error);
  process.exit(1);
});
