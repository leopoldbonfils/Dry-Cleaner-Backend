const { getPool } = require('../config/database');

/**
 * Create Users table (PostgreSQL version)
 *
 * Key changes from MySQL:
 *  - SERIAL replaces INT AUTO_INCREMENT
 *  - ENUM replaced with VARCHAR + CHECK constraint
 *  - ON UPDATE CURRENT_TIMESTAMP handled via trigger (created below)
 *  - Indexes created with separate CREATE INDEX statements
 *  - ENGINE / CHARSET clauses removed
 */
const createUsersTable = async () => {
  const pool = getPool();

  try {
    //  Table 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              SERIAL PRIMARY KEY,
        full_name       VARCHAR(100) NOT NULL,
        email           VARCHAR(255) UNIQUE NOT NULL,
        phone           VARCHAR(20),
        business_name   VARCHAR(100),
        password_hash   VARCHAR(255) NOT NULL,
        is_verified     BOOLEAN DEFAULT FALSE,
        otp_code        VARCHAR(6),
        otp_expires_at  TIMESTAMP,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    //  Indexes 
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email
        ON users (email)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_otp
        ON users (otp_code, otp_expires_at)
    `);

    //  auto-update trigger for updated_at 
    // PostgreSQL has no ON UPDATE CURRENT_TIMESTAMP; we use a trigger instead.
    await pool.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create trigger only if it doesn't already exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'trg_users_updated_at'
        ) THEN
          CREATE TRIGGER trg_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END
      $$
    `);

    console.log(' Users table ready');
    return true;
  } catch (error) {
    console.error(' Error creating users table:', error.message);
    throw error;
  }
};

module.exports = {
  createUsersTable
};