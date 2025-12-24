const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cleanpro_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool (will be initialized after database creation)
let pool = null;

/**
 * Create database if it doesn't exist
 */
const createDatabase = async () => {
  let connection;
  
  try {
    // Connect without specifying database
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Create database if it doesn't exist
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${dbConfig.database} 
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    console.log(`✅ Database '${dbConfig.database}' ready`);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    if (connection) await connection.end();
    throw error;
  }
};

/**
 * Initialize connection pool
 */
const initializePool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Database connection pool created');
  }
  return pool;
};

/**
 * Get database connection pool
 */
const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool first.');
  }
  return pool;
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

/**
 * Initialize database (create database and pool)
 */
const initializeDatabase = async () => {
  try {
    await createDatabase();
    initializePool();
    await testConnection();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  initializeDatabase,
  getPool,
  dbConfig
};