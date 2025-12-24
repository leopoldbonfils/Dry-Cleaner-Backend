const Order = require('../models/Order');
const { generateOrderCode, calculateTotal, validateOrderData, camelToSnake } = require('../utils/helpers');

/**
 * Get all orders
 */
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll();
    
    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get single order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

/**
 * Create new order
 */
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    // Convert camelCase to snake_case for database
    const dbData = {
      client_name: orderData.clientName,
      client_phone: orderData.clientPhone,
      items: orderData.items,
      payment_method: orderData.paymentMethod,
      payment_status: orderData.paymentStatus,
      total_amount: orderData.totalAmount || calculateTotal(orderData.items),
      order_code: generateOrderCode()
    };

    // Validate data
    const validation = validateOrderData({
      clientName: dbData.client_name,
      clientPhone: dbData.client_phone,
      items: dbData.items,
      paymentMethod: dbData.payment_method,
      paymentStatus: dbData.payment_status
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Create order
    const newOrder = await Order.create(dbData);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

/**
 * Update order
 */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Convert camelCase to snake_case
    const dbUpdates = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.paymentMethod) dbUpdates.payment_method = updates.paymentMethod;
    if (updates.paymentStatus) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.clientName) dbUpdates.client_name = updates.clientName;
    if (updates.clientPhone) dbUpdates.client_phone = updates.clientPhone;

    if (Object.keys(dbUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const updatedOrder = await Order.update(id, dbUpdates);

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: error.message
    });
  }
};

/**
 * Delete order
 */
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Order.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      error: error.message
    });
  }
};

/**
 * Search orders
 */
const searchOrders = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const orders = await Order.search(query);

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search orders',
      error: error.message
    });
  }
};

/**
 * Get statistics
 */
const getStats = async (req, res) => {
  try {
    const stats = await Order.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  searchOrders,
  getStats
};