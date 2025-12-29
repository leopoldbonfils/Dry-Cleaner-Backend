const { getPool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Create new user
   */
  static async create(userData) {
    const pool = getPool();
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);
    
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, phone, business_name, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userData.fullName,
        userData.email,
        userData.phone || null,
        userData.businessName || null,
        passwordHash
      ]
    );

    return await this.findById(result.insertId);
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, full_name, email, phone, business_name, is_verified, created_at FROM users WHERE id = ?',
      [id]
    );
    return users[0] || null;
  }

  /**
   * Find user by email (includes password for authentication)
   */
  static async findByEmail(email) {
    const pool = getPool();
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return users[0] || null;
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate and save OTP
   */
  static async generateOTP(userId) {
    const pool = getPool();
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // OTP expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await pool.query(
      'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?',
      [otp, expiresAt, userId]
    );
    
    return otp;
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(email, otp) {
    const pool = getPool();
    
    const [users] = await pool.query(
      `SELECT * FROM users 
       WHERE email = ? 
       AND otp_code = ? 
       AND otp_expires_at > NOW()`,
      [email, otp]
    );
    
    if (users.length === 0) {
      return null;
    }
    
    // Mark user as verified and clear OTP
    await pool.query(
      'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = ?',
      [users[0].id]
    );
    
    return users[0];
  }

  /**
   * Clear OTP
   */
  static async clearOTP(userId) {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?',
      [userId]
    );
  }
}

module.exports = User;