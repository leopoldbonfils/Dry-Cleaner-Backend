const { getPool } = require('../config/database');

/**
 * Add client_email column to orders table (migration guard)
 *
 * PostgreSQL version:
 *  - Uses information_schema instead of TABLE_SCHEMA = ?
 *  - No AFTER clause (not supported in PostgreSQL)
 *  - Index created with CREATE INDEX IF NOT EXISTS
 */
const addClientEmailColumn = async () => {
  const pool = getPool();

  try {
    const { rows } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_catalog = current_database()
        AND table_schema  = 'public'
        AND table_name    = 'orders'
        AND column_name   = 'client_email'
    `);

    if (rows.length > 0) {
      console.log('ℹ️  client_email column already exists');
      return true;
    }

    await pool.query(`
      ALTER TABLE orders
        ADD COLUMN client_email VARCHAR(255)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_client_email
        ON orders (client_email)
    `);

    console.log(' client_email column added to orders table');
    return true;
  } catch (error) {
    console.error(' Error adding client_email column:', error.message);
    throw error;
  }
};

module.exports = {
  addClientEmailColumn
};