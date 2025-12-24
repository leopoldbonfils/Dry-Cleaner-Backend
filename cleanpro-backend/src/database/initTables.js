const { getPool } = require('../config/database');

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
      status ENUM('Pending', 'Washing', 'Ironing', 'Ready', 'Picked Up') DEFAULT 'Pending',
      payment_method ENUM('Cash', 'Mobile Money', 'Bank Card') NOT NULL,
      payment_status ENUM('Paid', 'Unpaid', 'Partial') DEFAULT 'Unpaid',
      total_amount DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order_code (order_code),
      INDEX idx_client_phone (client_phone),
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
 * Check if sample data exists
 */
const hasSampleData = async () => {
  const pool = getPool();
  
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM orders');
    return rows[0].count > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Insert sample data for testing
 */
const insertSampleData = async () => {
  const pool = getPool();
  
  // Check if data already exists
  if (await hasSampleData()) {
    console.log('ℹ️  Sample data already exists, skipping...');
    return true;
  }

  const sampleOrders = [
    {
      order_code: 'DC001234567',
      client_name: 'Jean Marie Nkurunziza',
      client_phone: '0788123456',
      status: 'Ready',
      payment_method: 'Mobile Money',
      payment_status: 'Paid',
      total_amount: 8500,
      created_at: '2024-12-22 09:00:00',
      updated_at: '2024-12-23 14:30:00',
      items: [
        { type: 'Shirt', quantity: 3, price: 1500 },
        { type: 'Trousers', quantity: 2, price: 2000 }
      ]
    },
    {
      order_code: 'DC001234568',
      client_name: 'Alice Uwase',
      client_phone: '0789234567',
      status: 'Washing',
      payment_method: 'Cash',
      payment_status: 'Unpaid',
      total_amount: 10000,
      created_at: '2024-12-23 10:30:00',
      updated_at: '2024-12-23 10:30:00',
      items: [
        { type: 'Dress', quantity: 2, price: 3000 },
        { type: 'Coat', quantity: 1, price: 4000 }
      ]
    },
    {
      order_code: 'DC001234569',
      client_name: 'Patrick Mugabo',
      client_phone: '0790345678',
      status: 'Ironing',
      payment_method: 'Mobile Money',
      payment_status: 'Paid',
      total_amount: 11000,
      created_at: '2024-12-23 08:00:00',
      updated_at: '2024-12-23 13:00:00',
      items: [
        { type: 'Suit', quantity: 1, price: 5000 },
        { type: 'Shirt', quantity: 4, price: 1500 }
      ]
    },
    {
      order_code: 'DC001234570',
      client_name: 'Marie Claire Uwera',
      client_phone: '0791456789',
      status: 'Pending',
      payment_method: 'Cash',
      payment_status: 'Unpaid',
      total_amount: 8000,
      created_at: '2024-12-23 15:00:00',
      updated_at: '2024-12-23 15:00:00',
      items: [
        { type: 'Dress', quantity: 1, price: 3000 },
        { type: 'Sweater', quantity: 2, price: 2500 }
      ]
    },
    {
      order_code: 'DC001234571',
      client_name: 'Emmanuel Habimana',
      client_phone: '0792567890',
      status: 'Picked Up',
      payment_method: 'Mobile Money',
      payment_status: 'Paid',
      total_amount: 12000,
      created_at: '2024-12-21 11:00:00',
      updated_at: '2024-12-22 16:00:00',
      items: [
        { type: 'Blanket', quantity: 1, price: 5000 },
        { type: 'Bed Sheet', quantity: 2, price: 3500 }
      ]
    }
  ];

  try {
    for (const order of sampleOrders) {
      // Insert order
      const [result] = await pool.query(
        `INSERT INTO orders (order_code, client_name, client_phone, status, 
         payment_method, payment_status, total_amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.order_code,
          order.client_name,
          order.client_phone,
          order.status,
          order.payment_method,
          order.payment_status,
          order.total_amount,
          order.created_at,
          order.updated_at
        ]
      );

      const orderId = result.insertId;

      // Insert order items
      for (const item of order.items) {
        await pool.query(
          'INSERT INTO order_items (order_id, type, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.type, item.quantity, item.price]
        );
      }
    }

    console.log('✅ Sample data inserted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error inserting sample data:', error.message);
    throw error;
  }
};

/**
 * Initialize all tables
 */
const initializeTables = async () => {
  try {
    console.log('🔧 Initializing database tables...');
    
    // Create tables in order (orders first, then order_items due to foreign key)
    await createOrdersTable();
    await createOrderItemsTable();
    
    // Insert sample data if enabled
    if (process.env.INSERT_SAMPLE_DATA === 'true') {
      await insertSampleData();
    }
    
    console.log('✅ All tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Table initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  initializeTables,
  createOrdersTable,
  createOrderItemsTable,
  insertSampleData
};