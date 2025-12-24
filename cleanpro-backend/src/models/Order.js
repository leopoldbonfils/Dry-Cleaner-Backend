const { getPool } = require('../config/database');

class Order {
  /**
   * Get all orders with their items
   */
  static async findAll() {
    const pool = getPool();
    
    const [orders] = await pool.query(`
      SELECT o.*, 
             JSON_ARRAYAGG(
               JSON_OBJECT(
                 'id', oi.id,
                 'type', oi.type,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);

    return orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
  }

  /**
   * Find order by ID
   */
  static async findById(id) {
    const pool = getPool();
    
    const [orders] = await pool.query(`
      SELECT o.*, 
             JSON_ARRAYAGG(
               JSON_OBJECT(
                 'id', oi.id,
                 'type', oi.type,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id
    `, [id]);

    if (orders.length === 0) {
      return null;
    }

    return {
      ...orders[0],
      items: JSON.parse(orders[0].items)
    };
  }

  /**
   * Create new order with items
   */
  static async create(orderData) {
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insert order
      const [orderResult] = await connection.query(
        `INSERT INTO orders (order_code, client_name, client_phone, status, 
         payment_method, payment_status, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderData.order_code,
          orderData.client_name,
          orderData.client_phone,
          orderData.status || 'Pending',
          orderData.payment_method,
          orderData.payment_status,
          orderData.total_amount
        ]
      );

      const orderId = orderResult.insertId;

      // Insert order items
      if (orderData.items && orderData.items.length > 0) {
        const itemsValues = orderData.items.map(item => [
          orderId,
          item.type,
          item.quantity,
          item.price
        ]);

        await connection.query(
          'INSERT INTO order_items (order_id, type, quantity, price) VALUES ?',
          [itemsValues]
        );
      }

      await connection.commit();

      // Return the created order
      return await this.findById(orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update order
   */
  static async update(id, updates) {
    const pool = getPool();
    
    const allowedFields = ['status', 'payment_method', 'payment_status', 'client_name', 'client_phone'];
    const updateFields = [];
    const updateValues = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateValues.push(id);

    await pool.query(
      `UPDATE orders SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    return await this.findById(id);
  }

  /**
   * Delete order (cascade deletes items)
   */
  static async delete(id) {
    const pool = getPool();
    
    const [result] = await pool.query('DELETE FROM orders WHERE id = ?', [id]);
    
    return result.affectedRows > 0;
  }

  /**
   * Search orders
   */
  static async search(query) {
    const pool = getPool();
    
    const [orders] = await pool.query(`
      SELECT o.*, 
             JSON_ARRAYAGG(
               JSON_OBJECT(
                 'id', oi.id,
                 'type', oi.type,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.order_code LIKE ? 
         OR o.client_name LIKE ? 
         OR o.client_phone LIKE ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);

    return orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
  }

  /**
   * Get statistics
   */
  static async getStats() {
    const pool = getPool();

    // Today's orders
    const [todayOrders] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE DATE(created_at) = CURDATE()
    `);

    // Pending orders
    const [pendingOrders] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status != 'Picked Up'
    `);

    // Today's income
    const [todayIncome] = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE DATE(created_at) = CURDATE() 
        AND payment_status = 'Paid'
    `);

    // Unpaid amount
    const [unpaidAmount] = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM orders 
      WHERE payment_status = 'Unpaid'
    `);

    return {
      todayOrders: todayOrders[0].count,
      pendingOrders: pendingOrders[0].count,
      todayIncome: parseFloat(todayIncome[0].total),
      unpaidAmount: parseFloat(unpaidAmount[0].total)
    };
  }
}

module.exports = Order;