const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  debug: true,
  logger: true
});

/**
 * Send OTP email
 */
const sendOTPEmail = async (email, fullName, otp) => {
  console.log('📧 Attempting to send OTP email to:', email);

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
    console.log('✅ OTP email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ OTP email failed:', error.message);
    throw error;
  }
};

/**
 * Send Password Reset email
 */
const sendPasswordResetEmail = async (email, fullName, otp) => {
  console.log('📧 Attempting to send password reset email to:', email);

  const mailOptions = {
    from: `"CleanPro" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your CleanPro Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px solid #ef4444; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #ef4444; letter-spacing: 8px; }
          .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${fullName}!</h2>
            <p>We received a request to reset your password. Use this code to reset it:</p>
            <div class="otp-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Password Reset Code</p>
              <div class="otp-code">${otp}</div>
            </div>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This code expires in 10 minutes</li>
                <li>Never share this code with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
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
    console.log('✅ Password reset email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Password reset email failed:', error.message);
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
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail, // ✅ Export the function
  testEmailConfig
};