const { getPool } = require('../config/database');

/**
 * Add client_email column to orders table
 */
const addClientEmailColumn = async () => {
  const pool = getPool();
  
  try {
    // Check if column already exists
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'client_email'
    `, [process.env.DB_NAME || 'cleanpro_db']);

    if (columns.length > 0) {
      console.log('ℹ️  client_email column already exists');
      return true;
    }

    // Add column
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN client_email VARCHAR(255) AFTER client_phone
    `);

    console.log('✅ client_email column added to orders table');
    return true;
  } catch (error) {
    console.error('❌ Error adding client_email column:', error.message);
    throw error;
  }
};

module.exports = {
  addClientEmailColumn
};