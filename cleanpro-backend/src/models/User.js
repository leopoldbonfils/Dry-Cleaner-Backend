const { getPool } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * User model – PostgreSQL version
 *
 * Driver differences from mysql2 → pg:
 *  ─ pool.query() → { rows, rowCount }  (no array destructuring)
 *  ─ Positional placeholders: $1, $2, … instead of ?
 *  ─ INSERT … RETURNING id  replaces result.insertId
 *  ─ TRUE / FALSE literals work directly in pg
 */
class User {
  //  create 
  static async create(userData) {
    const pool = getPool();

    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, phone, business_name, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        userData.fullName,
        userData.email,
        userData.phone        || null,
        userData.businessName || null,
        passwordHash
      ]
    );

    return await this.findById(rows[0].id);
  }

  //  findById 
  static async findById(id) {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT id, full_name, email, phone, business_name, is_verified, created_at
       FROM   users
       WHERE  id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  //  findByEmail 
  static async findByEmail(email) {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  }

  //  verifyPassword
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  //  generateOTP
  static async generateOTP(userId) {
    const pool = getPool();

    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
      [otp, expiresAt, userId]
    );

    return otp;
  }

  //  verifyOTP
  static async verifyOTP(email, otp) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT * FROM users
       WHERE  email          = $1
         AND  otp_code       = $2
         AND  otp_expires_at > NOW()`,
      [email, otp]
    );

    if (rows.length === 0) return null;

    await pool.query(
      `UPDATE users
       SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL
       WHERE id = $1`,
      [rows[0].id]
    );

    return rows[0];
  }

  //    checkOTP (for password-reset – does not clear the OTP) 
  static async checkOTP(email, otp) {
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT 1 FROM users
       WHERE  email          = $1
         AND  otp_code       = $2
         AND  otp_expires_at > NOW()`,
      [email, otp]
    );

    return rows.length > 0;
  }

  //  clearOTP (for password-reset – clears OTP without verifying it)
  static async clearOTP(userId) {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
      [userId]
    );
  }

  //  updatePassword (by userId) 
  static async updatePassword(userId, newPassword) {
    const pool = getPool();

    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, userId]
    );

    return true;
  }

  //  updateProfile 
  static async updateProfile(email, updates) {
    const pool = getPool();

    const allowedFields = ['full_name', 'phone', 'business_name'];
    const setClauses    = [];
    const values        = [];
    let   paramIdx      = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        setClauses.push(`${key} = $${paramIdx++}`);
        values.push(updates[key]);
      }
    });

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(email);

    await pool.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE email = $${paramIdx}`,
      values
    );

    return await this.findByEmail(email);
  }

  //  changePassword (by email) 
  static async changePassword(email, newPassword) {
    const pool = getPool();

    const salt         = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [passwordHash, email]
    );

    return true;
  }
}

module.exports = User;