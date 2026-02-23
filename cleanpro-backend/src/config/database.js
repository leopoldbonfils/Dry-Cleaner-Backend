const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cleanpro_db',
  max: 10,                  // connectionLimit equivalent
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};

// Connection pool (initialized once)
let pool = null;

/**
 * Create database if it doesn't exist.
 * PostgreSQL requires connecting to a maintenance DB (postgres) first.
 */
const createDatabase = async () => {
  // Connect to the default 'postgres' database to run CREATE DATABASE
  const adminPool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres'   // always exists
  });

  try {
    // Check if the target database already exists
    const { rows } = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbConfig.database]
    );

    if (rows.length === 0) {
      // identifiers cannot be parameterised in DDL — safe because it comes from .env
      await adminPool.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`✅ Database '${dbConfig.database}' created`);
    } else {
      console.log(`✅ Database '${dbConfig.database}' already exists`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
};

/**
 * Initialize the connection pool pointing at our application database.
 */
const initializePool = () => {
  if (!pool) {
    pool = new Pool(dbConfig);

    // Surface unexpected idle errors so they don't silently swallow problems
    pool.on('error', (err) => {
      console.error('❌ Unexpected database pool error:', err.message);
    });

    console.log('✅ Database connection pool created');
  }
  return pool;
};

/**
 * Return the active pool (throws if called before initializePool).
 */
const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool first.');
  }
  return pool;
};

/**
 * Verify that the pool can actually reach PostgreSQL.
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

/**
 * Full boot sequence: create DB → create pool → test.
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
  initializePool,
  getPool,
  dbConfig
};