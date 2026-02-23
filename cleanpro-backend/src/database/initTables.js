const { getPool } = require('../config/database');
const { createUsersTable } = require('./initUsers');

/**
 * Add client_email column to orders if it doesn't already exist (migration guard).
 *
 * PostgreSQL version:
 *  - Uses information_schema with table_catalog / table_schema instead of TABLE_SCHEMA = ?
 *  - No AFTER clause (column is appended to the end, which is the safe default)
 *  - Indexes created with separate CREATE INDEX ... IF NOT EXISTS
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
      console.log('  client_email column already exists');
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

    console.log('client_email column added to orders table');
    return true;
  } catch (error) {
    console.error(' Error adding client_email column:', error.message);
    throw error;
  }
};

/**
 * Create Orders table (PostgreSQL version)
 *
 * Key changes from MySQL:
 *  - SERIAL replaces INT AUTO_INCREMENT
 *  - ENUM replaced with VARCHAR + CHECK constraints
 *  - Indexes extracted into separate CREATE INDEX IF NOT EXISTS statements
 *  - ENGINE / CHARSET clauses removed
 *  - ON UPDATE CURRENT_TIMESTAMP handled by trigger (defined in initUsers.js)
 */
const createOrdersTable = async () => {
  const pool = getPool();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id              SERIAL PRIMARY KEY,
        order_code      VARCHAR(50)    UNIQUE NOT NULL,
        client_name     VARCHAR(100)   NOT NULL,
        client_phone    VARCHAR(20)    NOT NULL,
        client_email    VARCHAR(255),
        status          VARCHAR(20)    NOT NULL DEFAULT 'Pending'
                          CHECK (status IN ('Pending','Washing','Ironing','Ready','Picked Up')),
        payment_method  VARCHAR(20)    NOT NULL
                          CHECK (payment_method IN ('Cash','Mobile Money','Bank Card')),
        payment_status  VARCHAR(10)    NOT NULL DEFAULT 'Unpaid'
                          CHECK (payment_status IN ('Paid','Unpaid','Partial')),
        total_amount    NUMERIC(10,2)  NOT NULL,
        created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_order_code     ON orders (order_code)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_client_phone   ON orders (client_phone)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_client_email   ON orders (client_email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status         ON orders (status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at     ON orders (created_at)`);

    // updated_at trigger (reuse the function created in initUsers)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'trg_orders_updated_at'
        ) THEN
          CREATE TRIGGER trg_orders_updated_at
          BEFORE UPDATE ON orders
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END
      $$
    `);

    console.log(' Orders table ready');
    return true;
  } catch (error) {
    console.error(' Error creating orders table:', error.message);
    throw error;
  }
};

/**
 * Create Order Items table (PostgreSQL version)
 */
const createOrderItemsTable = async () => {
  const pool = getPool();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id        SERIAL PRIMARY KEY,
        order_id  INT            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        type      VARCHAR(50)    NOT NULL,
        quantity  INT            NOT NULL,
        price     NUMERIC(10,2)  NOT NULL
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id
        ON order_items (order_id)
    `);

    console.log(' Order items table ready');
    return true;
  } catch (error) {
    console.error(' Error creating order_items table:', error.message);
    throw error;
  }
};

/**
 * Initialize all tables in dependency order.
 */
const initializeTables = async () => {
  try {
    console.log('🔧 Initializing database tables...');

    // Users must come first (set_updated_at function lives here)
    await createUsersTable();
    await createOrdersTable();
    await createOrderItemsTable();

    // Migration guard – idempotent
    await addClientEmailColumn();

    console.log(' All tables initialized successfully');
    console.log('ℹ  Database is empty and ready for your first order!');
    return true;
  } catch (error) {
    console.error(' Table initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  initializeTables,
  createOrdersTable,
  createOrderItemsTable
};