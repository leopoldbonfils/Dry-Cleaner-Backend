const { getPool } = require('../config/database');
const { createUsersTable } = require('./initUsers');

/**
 * Add client_email column to orders table if it doesn't exist
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
      ADD COLUMN client_email VARCHAR(255) AFTER client_phone,
      ADD INDEX idx_client_email (client_email)
    `);

    console.log('✅ client_email column added to orders table');
    return true;
  } catch (error) {
    console.error('❌ Error adding client_email column:', error.message);
    throw error;
  }
};

/**
 * Create Orders table
 */
const createOrdersTable = async () => {
  const pool = getPool();
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS orders (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_code VARCHAR(50) UNIQUE NOT NULL,
      client_name VARCHAR(100) NOT NULL,
      client_phone VARCHAR(20) NOT NULL,
      client_email VARCHAR(255),
      status ENUM('Pending', 'Washing', 'Ironing', 'Ready', 'Picked Up') DEFAULT 'Pending',
      payment_method ENUM('Cash', 'Mobile Money', 'Bank Card') NOT NULL,
      payment_status ENUM('Paid', 'Unpaid', 'Partial') DEFAULT 'Unpaid',
      total_amount DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order_code (order_code),
      INDEX idx_client_phone (client_phone),
      INDEX idx_client_email (client_email),
      INDEX idx_status (status),
      INDEX idx_payment_status (payment_status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.query(createTableQuery);
    console.log('✅ Orders table ready');
    return true;
  } catch (error) {
    console.error('❌ Error creating orders table:', error.message);
    throw error;
  }
};

/**
 * Create Order Items table
 */
const createOrderItemsTable = async () => {
  const pool = getPool();
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS order_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      INDEX idx_order_id (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.query(createTableQuery);
    console.log('✅ Order items table ready');
    return true;
  } catch (error) {
    console.error('❌ Error creating order_items table:', error.message);
    throw error;
  }
};

/**
 * Initialize all tables
 */
const initializeTables = async () => {
  try {
    console.log('🔧 Initializing database tables...');
    
    // Create tables in order (users first, then orders, then order_items due to foreign keys)
    await createUsersTable();
    await createOrdersTable();
    await createOrderItemsTable();
    
    // Run migration to add client_email if table exists without it
    await addClientEmailColumn();
    
    console.log('✅ All tables initialized successfully');
    console.log('ℹ️  Database is empty and ready for your first order!');
    return true;
  } catch (error) {
    console.error('❌ Table initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  initializeTables,
  createOrdersTable,
  createOrderItemsTable
};