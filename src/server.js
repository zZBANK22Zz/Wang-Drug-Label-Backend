const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes และ middleware
const memberRoutes = require('./routes/memberRoutes');
const productRoutes = require('./routes/productRoutes');
const prescriptionLogsRoute = require('./routes/prescription-logsRoute');
const productPharmaRoutes = require('./routes/productPharmaRoutes')
const { requestLogger, errorHandler, notFound, validateJSON } = require('./middleware');
const pharmaVerify = require('./routes/pharma-verify')
const pharmaPersonalRoutes = require('./routes/pharmaPersonalRoutes')

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8000'], // URL ของ Frontend
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(validateJSON);
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      members: 'active',
      products: 'active' // เพิ่ม service ใหม่
    }
  });
});

// API Routes
app.use('/api/members', memberRoutes);
app.use('/api/products', productRoutes); // เพิ่ม product routes
app.use('/api', prescriptionLogsRoute);
app.use('/api',productPharmaRoutes)
app.use('/api', pharmaVerify)
app.use('/api/pharma-personal', pharmaPersonalRoutes)

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Drug Label API v1.0',
    endpoints: {
      members: {
        base: '/api/members',
        description: 'Member management system',
        endpoints: [
          'GET /api/members - Get all members',
          'GET /api/members/:id - Get member by ID',
          'POST /api/members - Create new member (register)',
          'POST /api/members/login - Login member',
          'PUT /api/members/:id - Update member (protected)',
          'PUT /api/members/:id/picking-status - Update picking status (protected)',
          'DELETE /api/members/:id - Delete member (protected)'
        ]
      },
      products: {
        base: '/api/products',
        description: 'Product and inventory management system',
        endpoints: [
          'GET /api/products - Get all products (with filtering)',
          'GET /api/products/:id - Get product by ID',
          'GET /api/products/code/:code - Get product by code',
          'GET /api/products/barcode/:barcode - Get product by barcode',
          'GET /api/products/floor/:floor - Get products by floor',
          'GET /api/products/low-stock - Get low stock products',
          'GET /api/products/stats - Get product statistics',
          'POST /api/products - Create new product (protected)',
          'PUT /api/products/:id - Update product (protected)',
          'PUT /api/products/:id/stock - Update product stock (protected)',
          'DELETE /api/products/:id - Delete product (protected)'
        ]
      }
    }
  });
});

// Handle 404
app.use(notFound);

// Error handling middleware (ต้องอยู่ท้ายสุด)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`👥 Members API: http://localhost:${PORT}/api/members`);
  console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});