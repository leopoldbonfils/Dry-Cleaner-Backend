const Order = require('../models/Order');
const { generateOrderCode, calculateTotal, validateOrderData } = require('../utils/helpers');

/**
 * Create new order
 */
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;

    // ✅ Data arrives as snake_case from api.js interceptor
    // So we use it directly without conversion
    const dbData = {
      client_name: orderData.client_name,      // ✅ Already snake_case
      client_phone: orderData.client_phone,    // ✅ Already snake_case
      items: orderData.items,
      payment_method: orderData.payment_method,  // ✅ Already snake_case
      payment_status: orderData.payment_status,  // ✅ Already snake_case
      total_amount: orderData.total_amount || calculateTotal(orderData.items),
      order_code: generateOrderCode()
    };

    // ✅ Validate using the snake_case data
    const validation = validateOrderData({
      clientName: dbData.client_name,     // Convert back for validator
      clientPhone: dbData.client_phone,   // Convert back for validator
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

    // ✅ Data already arrives as snake_case from api.js
    const dbUpdates = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.payment_method) dbUpdates.payment_method = updates.payment_method;
    if (updates.payment_status) dbUpdates.payment_status = updates.payment_status;
    if (updates.client_name) dbUpdates.client_name = updates.client_name;
    if (updates.client_phone) dbUpdates.client_phone = updates.client_phone;

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

// Export other functions unchanged
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