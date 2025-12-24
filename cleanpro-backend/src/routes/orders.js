const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');

// GET routes
router.get('/', ordersController.getAllOrders);
router.get('/stats', ordersController.getStats);
router.get('/search', ordersController.searchOrders);
router.get('/:id', ordersController.getOrderById);

// POST routes
router.post('/', ordersController.createOrder);

// PUT routes
router.put('/:id', ordersController.updateOrder);

// DELETE routes
router.delete('/:id', ordersController.deleteOrder);

module.exports = router;