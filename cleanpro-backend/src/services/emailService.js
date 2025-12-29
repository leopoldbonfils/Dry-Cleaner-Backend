const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  debug: true, // Enable debug logs
  logger: true  // Enable logger
});

/**
 * Send OTP email
 */
const sendOTPEmail = async (email, fullName, otp) => {
  console.log('📧 Attempting to send email to:', email);
  console.log('📧 Using SMTP:', {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    passConfigured: !!process.env.EMAIL_PASSWORD
  });

  const mailOptions = {
    from: `"CleanPro" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your CleanPro Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧺 CleanPro</h1>
            <p>Verify Your Account</p>
          </div>
          <div class="content">
            <h2>Hello ${fullName}!</h2>
            <p>Your verification code is:</p>
            
            <div class="otp-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Your Verification Code</p>
              <div class="otp-code">${otp}</div>
            </div>
            
            <p><strong>This code will expire in 10 minutes.</strong></p>
            <p>If you didn't request this code, please ignore this email.</p>
            
            <p>Best regards,<br>The CleanPro Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CleanPro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Full Error:', error);
    throw error;
  }
};

/**
 * Test email configuration
 */
const testEmailConfig = async () => {
  try {
    console.log('🔍 Testing email configuration...');
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    console.error('Please check:');
    console.error('  1. EMAIL_USER is set in .env');
    console.error('  2. EMAIL_PASSWORD is a valid Gmail App Password');
    console.error('  3. 2-Factor Authentication is enabled on Gmail');
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  testEmailConfig
};