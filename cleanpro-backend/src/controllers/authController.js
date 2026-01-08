const User = require('../models/User');
const { sendOTPEmail, sendPasswordResetEmail } = require('../services/emailService');

/**
 * Register new user (NO OTP SENT HERE)
 */
const register = async (req, res) => {
  try {
    console.log('📥 Registration Request Body:', JSON.stringify(req.body, null, 2));
    
    // Accept both camelCase and snake_case
    const fullName = req.body.fullName || req.body.full_name;
    const email = req.body.email;
    const phone = req.body.phone;
    const businessName = req.body.businessName || req.body.business_name;
    const password = req.body.password;

    console.log('📋 Extracted Values:', { fullName, email, phone, businessName, password });

    // Validation
    if (!fullName || !email || !password) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and password are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      businessName,
      password
    });

    console.log('✅ User created with ID:', user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please login to continue.',
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name
      }
    });
  } catch (error) {
    console.error('❌ Error in register:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login user (SEND OTP HERE)
 */
const login = async (req, res) => {
  try {
    console.log('📥 Login Request Body:', JSON.stringify(req.body, null, 2));
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ Password verified for user:', user.id);

    // Generate OTP
    const otp = await User.generateOTP(user.id);
    
    // Development mode: show in console
    if (process.env.NODE_ENV === 'development') {
      console.log('\n╔════════════════════════════════════╗');
      console.log('║   🔐 LOGIN OTP (DEV)              ║');
      console.log('╠════════════════════════════════════╣');
      console.log(`║  Email: ${email.padEnd(22)}║`);
      console.log(`║  OTP:   ${otp}                      ║`);
      console.log('╚════════════════════════════════════╝\n');
    }
    
    // Send OTP email
    try {
      await sendOTPEmail(email, user.full_name, otp);
      console.log('✅ OTP email sent successfully to:', email);
    } catch (emailError) {
      console.warn('⚠️ Email failed, but OTP shown in console:', emailError.message);
    }

    // Return response requiring OTP verification
    res.json({
      success: true,
      message: 'Verification code sent to your email. Please verify to continue.',
      requiresVerification: true,
      email: user.email,
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name
      }
    });
  } catch (error) {
    console.error('❌ Error in login:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Verify OTP (GRANT ACCESS TO DASHBOARD)
 */
const verifyOTP = async (req, res) => {
  try {
    console.log('📥 Verify OTP Request Body:', JSON.stringify(req.body, null, 2));
    
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const user = await User.verifyOTP(email, otp);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    console.log('✅ OTP verified successfully for user:', user.id);

    res.json({
      success: true,
      message: 'Verification successful! Redirecting to dashboard...',
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        businessName: user.business_name,
        phone: user.phone,
        isVerified: true,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error in verifyOTP:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
};

/**
 * Resend OTP
 */
const resendOTP = async (req, res) => {
  try {
    console.log('📥 Resend OTP Request Body:', JSON.stringify(req.body, null, 2));
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new OTP
    const otp = await User.generateOTP(user.id);
    console.log('🔐 New OTP Generated:', otp);

    // Send OTP email
    try {
      await sendOTPEmail(email, user.full_name, otp);
      console.log('✅ OTP resent successfully to:', email);
    } catch (emailError) {
      console.warn('⚠️ Email failed, but OTP shown in console:', emailError.message);
    }

    res.json({
      success: true,
      message: 'New verification code sent to your email'
    });
  } catch (error) {
    console.error('❌ Error in resendOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message
    });
  }
};

/**
 * Forgot Password - Send reset OTP
 */
const forgotPassword = async (req, res) => {
  try {
    console.log('📥 Forgot Password Request:', req.body);
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists (security)
      return res.json({
        success: true,
        message: 'If this email is registered, you will receive a password reset code.'
      });
    }

    // Generate OTP
    const otp = await User.generateOTP(user.id);
    
    // Development mode: show in console
    if (process.env.NODE_ENV === 'development') {
      console.log('\n╔════════════════════════════════════╗');
      console.log('║   🔐 PASSWORD RESET OTP (DEV)     ║');
      console.log('╠════════════════════════════════════╣');
      console.log(`║  Email: ${email.padEnd(22)}║`);
      console.log(`║  OTP:   ${otp}                      ║`);
      console.log('╚════════════════════════════════════╝\n');
    }

    // Send email
    try {
      await sendPasswordResetEmail(email, user.full_name, otp);
      console.log('✅ Password reset email sent to:', email);
    } catch (emailError) {
      console.warn('⚠️ Email failed, but OTP shown in console:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Password reset code sent to your email',
      email: email
    });
  } catch (error) {
    console.error('❌ Error in forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
};

/**
 * Verify Reset OTP (doesn't reset password yet)
 */
const verifyResetOTP = async (req, res) => {
  try {
    console.log('📥 Verify Reset OTP Request:', req.body);
    
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check OTP (don't clear it yet)
    const isValidOTP = await User.checkOTP(email, otp);
    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    console.log('✅ Reset OTP verified for user:', user.id);

    res.json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      verified: true
    });
  } catch (error) {
    console.error('❌ Error in verifyResetOTP:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
};

/**
 * Reset Password (after OTP verification)
 */
const resetPassword = async (req, res) => {
  try {
    console.log('📥 Reset Password Request:', req.body);
    
    // Accept both camelCase and snake_case
    const email = req.body.email;
    const otp = req.body.otp;
    const newPassword = req.body.newPassword || req.body.new_password;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check OTP again
    const isValidOTP = await User.checkOTP(email, otp);
    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new reset code.'
      });
    }

    // Update password
    await User.updatePassword(user.id, newPassword);
    
    // Clear OTP
    await User.clearOTP(user.id);

    console.log('✅ Password reset successful for user:', user.id);

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('❌ Error in resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};

/**
 * Get user profile
 */
const getProfile = async (req, res) => {
  try {
    const { email } = req.body; // Or get from JWT token in production
    
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        userId: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        businessName: user.business_name,
        isVerified: user.is_verified,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error in getProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    console.log('📝 Update Profile Request:', req.body);
    
    const { email, full_name, phone, business_name } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!full_name || full_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Full name is required'
      });
    }

    // Update profile
    const updatedUser = await User.updateProfile(email, {
      full_name,
      phone,
      business_name
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        userId: updatedUser.id,
        fullName: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        businessName: updatedUser.business_name,
        isVerified: updatedUser.is_verified
      }
    });
  } catch (error) {
    console.error('❌ Error in updateProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    console.log('🔒 Change Password Request');
    
    const { email, current_password, new_password } = req.body;

    // Validation
    if (!email || !current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Email, current password, and new password are required'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await User.verifyPassword(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await User.changePassword(email, new_password);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ Error in changePassword:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  register,
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  getProfile,      // ✅ Added
  updateProfile,   // ✅ Added
  changePassword   // ✅ Added
};