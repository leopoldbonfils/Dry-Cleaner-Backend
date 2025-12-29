const User = require('../models/User');
const { sendOTPEmail } = require('../services/emailService');

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

    // ✅ NO OTP SENT - Just return success
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

    // ✅ ALWAYS SEND OTP (whether verified or not)
    const otp = await User.generateOTP(user.id);
    console.log('🔐 OTP Generated:', otp); // For testing - remove in production
    
    // Send OTP email
    try {
      await sendOTPEmail(email, user.full_name, otp);
      console.log('✅ OTP email sent successfully to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send OTP email:', emailError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please try again.'
      });
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

    // ✅ Grant access to dashboard
    res.json({
      success: true,
      message: 'Verification successful! Redirecting to dashboard...',
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        businessName: user.business_name,
        isVerified: true
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
    console.log('🔐 New OTP Generated:', otp); // For testing - remove in production

    // Send OTP email
    try {
      await sendOTPEmail(email, user.full_name, otp);
      console.log('✅ OTP resent successfully to:', email);
    } catch (emailError) {
      console.error('❌ Failed to resend OTP email:', emailError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please try again.'
      });
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

module.exports = {
  register,
  login,
  verifyOTP,
  resendOTP
};