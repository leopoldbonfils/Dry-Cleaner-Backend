const Order = require('../models/Order');
const { sendOrderConfirmationEmail, sendOrderReadyEmail } = require('../services/emailService');
const { generateOrderCode, calculateTotal, validateOrderData } = require('../utils/helpers');

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

    // ✅ Data arrives as snake_case from api.js interceptor
    const dbData = {
      client_name: orderData.client_name,
      client_phone: orderData.client_phone,
      client_email: orderData.client_email || null,
      items: orderData.items,
      payment_method: orderData.payment_method,
      payment_status: orderData.payment_status,
      total_amount: orderData.total_amount || calculateTotal(orderData.items),
      order_code: generateOrderCode()
    };

    // ✅ Validate
    const validation = validateOrderData({
      clientName: dbData.client_name,
      clientPhone: dbData.client_phone,
      clientEmail: dbData.client_email,
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

    // ✅ Send order confirmation email to client
    if (dbData.client_email) {
      try {
        console.log('📧 Sending order confirmation email...');
        
        // Development mode: show in console
        if (process.env.NODE_ENV === 'development') {
          console.log('\n╔════════════════════════════════════════╗');
          console.log('║   📧 ORDER CONFIRMATION EMAIL (DEV)   ║');
          console.log('╠════════════════════════════════════════╣');
          console.log(`║  To:    ${dbData.client_email.padEnd(28)}║`);
          console.log(`║  Order: ${newOrder.order_code.padEnd(28)}║`);
          console.log('╚════════════════════════════════════════╝\n');
        }
        
        await sendOrderConfirmationEmail(
          dbData.client_email,
          dbData.client_name,
          {
            orderCode: newOrder.order_code,
            createdAt: newOrder.created_at,
            status: newOrder.status,
            paymentMethod: newOrder.payment_method,
            paymentStatus: newOrder.payment_status,
            totalAmount: newOrder.total_amount,
            items: newOrder.items,
            clientPhone: newOrder.client_phone
          }
        );
        console.log('✅ Order confirmation email sent to:', dbData.client_email);
      } catch (emailError) {
        console.warn('⚠️ Failed to send order confirmation email:', emailError.message);
        // Don't fail the order creation if email fails
      }
    }

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

    // Get current order to check status change
    const currentOrder = await Order.findById(id);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // ✅ Data already arrives as snake_case from api.js
    const dbUpdates = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.payment_method) dbUpdates.payment_method = updates.payment_method;
    if (updates.payment_status) dbUpdates.payment_status = updates.payment_status;
    if (updates.client_name) dbUpdates.client_name = updates.client_name;
    if (updates.client_phone) dbUpdates.client_phone = updates.client_phone;
    if (updates.client_email !== undefined) dbUpdates.client_email = updates.client_email;

    if (Object.keys(dbUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const updatedOrder = await Order.update(id, dbUpdates);

    // ✅ Send email notification if status changed to "Ready"
    if (updates.status === 'Ready' && currentOrder.status !== 'Ready' && updatedOrder.client_email) {
      try {
        console.log('📧 Sending order ready notification...');
        
        // Development mode: show in console
        if (process.env.NODE_ENV === 'development') {
          console.log('\n╔════════════════════════════════════════╗');
          console.log('║   📧 ORDER READY EMAIL (DEV)          ║');
          console.log('╠════════════════════════════════════════╣');
          console.log(`║  To:    ${updatedOrder.client_email.padEnd(28)}║`);
          console.log(`║  Order: ${updatedOrder.order_code.padEnd(28)}║`);
          console.log('╚════════════════════════════════════════╝\n');
        }
        
        await sendOrderReadyEmail(
          updatedOrder.client_email,
          updatedOrder.client_name,
          {
            orderCode: updatedOrder.order_code,
            status: updatedOrder.status,
            paymentStatus: updatedOrder.payment_status,
            totalAmount: updatedOrder.total_amount,
            items: updatedOrder.items,
            clientPhone: updatedOrder.client_phone
          }
        );
        console.log('✅ Order ready email sent to:', updatedOrder.client_email);
      } catch (emailError) {
        console.warn('⚠️ Failed to send order ready email:', emailError.message);
        // Don't fail the update if email fails
      }
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