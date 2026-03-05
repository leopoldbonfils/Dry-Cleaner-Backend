const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authenticate = require('../middleware/authenticate');

// All order routes require a valid JWT token
router.get('/',        authenticate, ordersController.getAllOrders);
router.get('/stats',   authenticate, ordersController.getStats);
router.get('/search',  authenticate, ordersController.searchOrders);
router.get('/:id',     authenticate, ordersController.getOrderById);
router.post('/',       authenticate, ordersController.createOrder);
router.put('/:id',     authenticate, ordersController.updateOrder);
router.delete('/:id',  authenticate, ordersController.deleteOrder);

module.exports = router;