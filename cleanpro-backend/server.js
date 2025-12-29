const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { initializeDatabase } = require('./src/config/database');
const { initializeTables } = require('./src/database/initTables');
const { createUsersTable } = require('./src/database/initUsers');
const { testEmailConfig } = require('./src/services/emailService');

const ordersRoutes = require('./src/routes/orders');
const authRoutes = require('./src/routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CleanPro API is running',
    timestamp: new Date().toISOString(),
    database: 'Connected',
    email: 'Configured'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CleanPro API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verifyOTP: 'POST /api/auth/verify-otp',
        resendOTP: 'POST /api/auth/resend-otp'
      },
      orders: '/api/orders',
      stats: '/api/orders/stats',
      search: '/api/orders/search?query=',
      documentation: 'See README.md for full API documentation'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

/**
 * Initialize and start server
 */
const startServer = async () => {
  try {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║        🧺 CLEANPRO BACKEND INITIALIZATION            ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // Step 1: Initialize database
    console.log('📦 Step 1: Initializing database...');
    await initializeDatabase();

    // Step 2: Initialize tables
    console.log('\n📋 Step 2: Creating tables...');
    await initializeTables();
    await createUsersTable();

    // Step 3: Test email service
    console.log('\n📧 Step 3: Testing email service...');
    await testEmailConfig();

    // Step 4: Start server
    console.log('\n🚀 Step 4: Starting server...');
    app.listen(PORT, () => {
      console.log('\n╔══════════════════════════════════════════════════════╗');
      console.log('║          ✅ CLEANPRO BACKEND READY!                   ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║   🌐 Server:      http://localhost:${PORT}              ║`);
      console.log(`║   📋 API Base:    http://localhost:${PORT}/api          ║`);
      console.log(`║   💚 Health:      http://localhost:${PORT}/api/health   ║`);
      console.log(`║   🔐 Auth:        http://localhost:${PORT}/api/auth     ║`);
      console.log(`║   📦 Orders:      http://localhost:${PORT}/api/orders   ║`);
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log('║   Database and tables created automatically!          ║');
      console.log('║   Ready to accept requests...                         ║');
      console.log('╚══════════════════════════════════════════════════════╝\n');
    });

  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error('\nPlease check:');
    console.error('  1. MySQL is running');
    console.error('  2. Database credentials in .env are correct');
    console.error('  3. Email credentials in .env are correct');
    console.error('  4. MySQL user has permission to create databases\n');
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;