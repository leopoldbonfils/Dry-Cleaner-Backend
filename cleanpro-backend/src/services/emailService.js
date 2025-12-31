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
 * Helper: Format currency for emails
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Helper: Format date for emails
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

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
 * Send Order Confirmation Email to Client
 */
const sendOrderConfirmationEmail = async (clientEmail, clientName, orderDetails) => {
  console.log('📧 Attempting to send order confirmation to:', clientEmail);

  const itemsHTML = orderDetails.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.type}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatCurrency(item.quantity * item.price)}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: `"CleanPro Dry Cleaning" <${process.env.EMAIL_USER}>`,
    to: clientEmail,
    subject: `Order Confirmation - ${orderDetails.orderCode}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; }
          .order-box { background: white; border: 2px solid #10b981; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .order-code { font-size: 28px; font-weight: bold; color: #10b981; text-align: center; margin: 10px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .info-label { font-weight: 600; color: #64748b; }
          .info-value { color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
          th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; color: #475569; }
          .total-row { background: #f1f5f9; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧺 CleanPro Dry Cleaning</h1>
            <p>Order Confirmation</p>
          </div>
          <div class="content">
            <h2>Hello ${clientName}!</h2>
            <p>Thank you for choosing CleanPro! Your order has been received and is being processed.</p>
            
            <div class="order-box">
              <p style="margin: 0; font-size: 14px; color: #666; text-align: center;">Order Number</p>
              <div class="order-code">${orderDetails.orderCode}</div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">📋 Order Information</h3>
              <div class="info-row">
                <span class="info-label">Order Date:</span>
                <span class="info-value">${formatDate(orderDetails.createdAt)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value" style="color: #f59e0b; font-weight: 600;">${orderDetails.status}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span class="info-value">${orderDetails.paymentMethod}</span>
              </div>
              <div class="info-row" style="border-bottom: none;">
                <span class="info-label">Payment Status:</span>
                <span class="info-value" style="color: ${orderDetails.paymentStatus === 'Paid' ? '#10b981' : '#ef4444'}; font-weight: 600;">${orderDetails.paymentStatus}</span>
              </div>
            </div>

            <h3 style="color: #1e293b;">👕 Order Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
                <tr class="total-row">
                  <td colspan="3" style="padding: 15px; text-align: right;">TOTAL AMOUNT:</td>
                  <td style="padding: 15px; text-align: right; color: #10b981;">${formatCurrency(orderDetails.totalAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <strong>📱 Need Help?</strong>
              <p style="margin: 10px 0 0 0;">Contact us at <strong>${orderDetails.clientPhone}</strong> or reply to this email.</p>
            </div>

            <p style="margin-top: 30px;">We'll notify you when your order is ready for pickup!</p>
            <p>Best regards,<br>The CleanPro Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CleanPro Dry Cleaning. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Order confirmation email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Order confirmation email failed:', error.message);
    throw error;
  }
};

/**
 * Send Order Ready Notification to Client
 */
const sendOrderReadyEmail = async (clientEmail, clientName, orderDetails) => {
  console.log('📧 Attempting to send order ready notification to:', clientEmail);

  const mailOptions = {
    from: `"CleanPro Dry Cleaning" <${process.env.EMAIL_USER}>`,
    to: clientEmail,
    subject: `Your Order is Ready! - ${orderDetails.orderCode}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; }
          .ready-box { background: white; border: 3px solid #10b981; border-radius: 10px; padding: 30px; margin: 20px 0; text-align: center; }
          .ready-icon { font-size: 64px; margin-bottom: 20px; }
          .order-code { font-size: 28px; font-weight: bold; color: #3b82f6; margin: 15px 0; }
          .pickup-info { background: #dbeafe; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .info-label { font-weight: 600; color: #64748b; }
          .info-value { color: #1e293b; font-weight: 600; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧺 CleanPro Dry Cleaning</h1>
            <p>Order Ready Notification</p>
          </div>
          <div class="content">
            <div class="ready-box">
              <div class="ready-icon">✅</div>
              <h2 style="color: #10b981; margin: 0;">Your Order is Ready!</h2>
              <p style="font-size: 18px; color: #64748b; margin: 10px 0;">You can pick up your clothes now</p>
              <div class="order-code">${orderDetails.orderCode}</div>
            </div>

            <h2>Hello ${clientName}!</h2>
            <p style="font-size: 16px;">Great news! Your dry cleaning order has been completed and is ready for pickup.</p>

            <div class="pickup-info">
              <h3 style="margin-top: 0; color: #1e293b;">📍 Pickup Information</h3>
              <div class="info-row">
                <span class="info-label">Order Code:</span>
                <span class="info-value">${orderDetails.orderCode}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total Items:</span>
                <span class="info-value">${orderDetails.items.reduce((sum, item) => sum + item.quantity, 0)} pieces</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total Amount:</span>
                <span class="info-value" style="color: #10b981; font-size: 18px;">${formatCurrency(orderDetails.totalAmount)}</span>
              </div>
              <div class="info-row" style="border-bottom: none;">
                <span class="info-label">Payment Status:</span>
                <span class="info-value" style="color: ${orderDetails.paymentStatus === 'Paid' ? '#10b981' : '#ef4444'};">${orderDetails.paymentStatus}</span>
              </div>
            </div>

            ${orderDetails.paymentStatus !== 'Paid' ? `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <strong>⚠️ Payment Required:</strong>
                <p style="margin: 10px 0 0 0;">Please bring <strong>${formatCurrency(orderDetails.totalAmount)}</strong> to complete your payment upon pickup.</p>
              </div>
            ` : ''}

            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <strong>📱 Questions?</strong>
              <p style="margin: 10px 0 0 0;">Contact us at <strong>${orderDetails.clientPhone}</strong> or reply to this email.</p>
            </div>

            <p style="margin-top: 30px;">We look forward to seeing you!</p>
            <p>Best regards,<br>The CleanPro Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 CleanPro Dry Cleaning. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Order ready email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Order ready email failed:', error.message);
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
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderReadyEmail,
  testEmailConfig
};