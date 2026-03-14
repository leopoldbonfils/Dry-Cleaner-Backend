const { getPool } = require('../config/database');

/**
 * Order model – PostgreSQL version
 *
 * Driver differences from mysql2 → pg:
 *  ─ pool.query() returns { rows, rowCount }, NOT [rows, fields]
 *  ─ Positional placeholders: $1, $2, … instead of ?
 *  ─ pool.getConnection() → pool.connect()  (returns a Client object)
 *  ─ client.beginTransaction() → client.query('BEGIN')
 *  ─ INSERT … RETURNING id  replaces result.insertId
 *  ─ result.affectedRows → result.rowCount
 *  ─ Bulk INSERT VALUES (…),(…) built manually (pg has no mysql2 nested-array shorthand)
 *  ─ JSON_ARRAYAGG / JSON_OBJECT / JSON_ARRAY → JSON_AGG / JSON_BUILD_OBJECT / FILTER WHERE
 *  ─ CURDATE()        → CURRENT_DATE
 *  ─ DATE(col)        → col::date
 */
class Order {
  //  shared JSON aggregation fragment
  // Produces a JSON array of items, or [] when the order has no items.
  static get #itemsAgg() {
    return `
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id',       oi.id,
            'type',     oi.type,
            'quantity', oi.quantity,
            'price',    oi.price
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
      ) AS items
    `;
  }

  static #parseItems(order) {
    return {
      ...order,
      items: typeof order.items === 'string'
        ? JSON.parse(order.items)
        : (order.items ?? [])
    };
  }

  //  findAll
  static async findAll(userId) {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT o.*, ${Order.#itemsAgg}
      FROM   orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE  o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);

    return rows.map(Order.#parseItems);
  }

  //  findById
  static async findById(id) {
    const pool = getPool();

    const { rows } = await pool.query(`
      SELECT o.*, ${Order.#itemsAgg}
      FROM   orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE  o.id = $1
      GROUP BY o.id
    `, [id]);

    if (rows.length === 0) return null;
    return Order.#parseItems(rows[0]);
  }

  //  create
  static async create(orderData) {
    const pool = getPool();
    const client = await pool.connect();   // ← pg equivalent of getConnection()

    try {
      await client.query('BEGIN');

      // Insert the order and get the new id via RETURNING
      const { rows: [order] } = await client.query(
        `INSERT INTO orders
           (user_id, order_code, client_name, client_phone, client_email,
            status, payment_method, payment_status, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          orderData.user_id || null,
          orderData.order_code,
          orderData.client_name,
          orderData.client_phone,
          orderData.client_email || null,
          orderData.status || 'Pending',
          orderData.payment_method,
          orderData.payment_status,
          orderData.total_amount
        ]
      );

      const orderId = order.id;

      // Bulk-insert items using unnest (clean, efficient, avoids string building)
      if (orderData.items && orderData.items.length > 0) {
        const orderIds = orderData.items.map(() => orderId);
        const types     = orderData.items.map(i => i.type);
        const quantities = orderData.items.map(i => i.quantity);
        const prices    = orderData.items.map(i => i.price);

        await client.query(
          `INSERT INTO order_items (order_id, type, quantity, price)
           SELECT * FROM UNNEST($1::int[], $2::text[], $3::int[], $4::numeric[])`,
          [orderIds, types, quantities, prices]
        );
      }

      await client.query('COMMIT');

      return await this.findById(orderId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  //  update
  static async update(id, updates) {
    const pool = getPool();

    const allowedFields = [
      'status', 'payment_method', 'payment_status',
      'client_name', 'client_phone', 'client_email'
    ];

    const setClauses = [];
    const values     = [];
    let   paramIdx   = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIdx++}`);
        values.push(updates[key]);
      }
    });

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    // updated_at is also handled by the DB trigger, but being explicit is fine
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);   // for the WHERE clause

    await pool.query(
      `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
      values
    );

    return await this.findById(id);
  }

  //  delete 
  static async delete(id) {
    const pool = getPool();

    const { rowCount } = await pool.query(
      'DELETE FROM orders WHERE id = $1',
      [id]
    );

    return rowCount > 0;
  }

  //  search
  static async search(query, userId) {
    const pool = getPool();
    const like = `%${query}%`;

    const { rows } = await pool.query(`
      SELECT o.*, ${Order.#itemsAgg}
      FROM   orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE  o.user_id = $5
        AND (o.order_code   ILIKE $1
          OR o.client_name  ILIKE $2
          OR o.client_phone ILIKE $3
          OR o.client_email ILIKE $4)
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [like, like, like, like, userId]);

    return rows.map(Order.#parseItems);
  }

  //  getStats
  static async getStats(userId) {
    const pool = getPool();

    const { rows: [todayRow] } = await pool.query(`
      SELECT COUNT(*) AS count
      FROM   orders
      WHERE  user_id = $1 AND created_at::date = CURRENT_DATE
    `, [userId]);

    const { rows: [pendingRow] } = await pool.query(`
      SELECT COUNT(*) AS count
      FROM   orders
      WHERE  user_id = $1 AND status <> 'Picked Up'
    `, [userId]);

    const { rows: [incomeRow] } = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM   orders
      WHERE  user_id = $1
        AND  created_at::date = CURRENT_DATE
        AND  payment_status = 'Paid'
    `, [userId]);

    const { rows: [unpaidRow] } = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM   orders
      WHERE  user_id = $1 AND payment_status = 'Unpaid'
    `, [userId]);

    return {
      todayOrders:   parseInt(todayRow.count,  10),
      pendingOrders: parseInt(pendingRow.count, 10),
      todayIncome:   parseFloat(incomeRow.total),
      unpaidAmount:  parseFloat(unpaidRow.total)
    };
  }
}

module.exports = Order;