const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import existing routes และ middleware
const memberRoutes = require('./src/routes/memberRoutes');
const productRoutes = require('./src/routes/productRoutes');
const prescriptionLogsRoute = require('./src/routes/prescription-logsRoute');
const productPharmaRoutes = require('./src/routes/productPharmaRoutes')
const { requestLogger, errorHandler, notFound, validateJSON } = require('./src/middleware');
const pharmaVerify = require('./src/routes/pharma-verify')
const pharmaPersonalRoutes = require('./src/routes/pharmaPersonalRoutes')

// Import Kafka components
const { connectKafka, disconnectKafka, subscribeToTopics, publishMessage } = require('./src/config/kafka');
const KafkaMessageHandler = require('./src/services/kafkaHandlers');

const app = express();
const PORT = process.env.PORT || 3000;
const CONTAINER_ROLE = process.env.CONTAINER_ROLE || 'main';

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://main-backend:3000',
      'http://second-backend:3001'
    ].filter(Boolean);
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(validateJSON);
app.use(requestLogger);

// Health check endpoint (Updated with container info)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    container: CONTAINER_ROLE,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      members: 'active',
      products: 'active',
      kafka: 'active'
    }
  });
});

// ===================================
// EXISTING API ROUTES
// ===================================
app.use('/api/members', memberRoutes);
app.use('/api/products', productRoutes);
app.use('/api', prescriptionLogsRoute);
app.use('/api', productPharmaRoutes);
app.use('/api', pharmaVerify);
app.use('/api/pharma-personal', pharmaPersonalRoutes);

// ===================================
// INTERNAL API ROUTES (สำหรับการสื่อสารระหว่าง containers)
// ===================================
app.use('/api/internal', (req, res, next) => {
  // Verify internal request
  if (req.headers['x-internal-request'] !== 'true') {
    return res.status(403).json({ 
      success: false, 
      message: 'Internal API access only' 
    });
  }
  next();
});

// Internal product endpoint
app.post('/api/internal/product', async (req, res) => {
  try {
    console.log(`📥 [${CONTAINER_ROLE}] Received internal product request:`, req.body);
    
    const { eventType, productData } = req.body;
    
    // Process ตาม eventType
    switch (eventType) {
      case 'CREATE':
        // เรียกใช้ product controller สำหรับสร้างข้อมูล
        console.log('Processing product creation:', productData);
        break;
      case 'UPDATE':
        // เรียกใช้ product controller สำหรับอัพเดต
        console.log('Processing product update:', productData);
        break;
      case 'DELETE':
        // เรียกใช้ product controller สำหรับลบ
        console.log('Processing product deletion:', productData);
        break;
      default:
        console.warn('Unknown product event type:', eventType);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Product processed successfully',
      container: CONTAINER_ROLE,
      eventType: eventType
    });
  } catch (error) {
    console.error('❌ Error processing internal product request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Internal member endpoint
app.post('/api/internal/member', async (req, res) => {
  try {
    console.log(`📥 [${CONTAINER_ROLE}] Received internal member request:`, req.body);
    
    const { eventType, memberData } = req.body;
    
    // Process ตาม eventType
    switch (eventType) {
      case 'CREATE':
        console.log('Processing member creation:', memberData);
        break;
      case 'UPDATE':
        console.log('Processing member update:', memberData);
        break;
      case 'DELETE':
        console.log('Processing member deletion:', memberData);
        break;
      default:
        console.warn('Unknown member event type:', eventType);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Member processed successfully',
      container: CONTAINER_ROLE,
      eventType: eventType
    });
  } catch (error) {
    console.error('❌ Error processing internal member request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// ===================================
// WEBHOOK ENDPOINTS (สำหรับรับข้อมูลจาก external services)
// ===================================

// Product webhook - รับข้อมูล product จาก external API
app.post('/webhook/product', async (req, res) => {
  try {
    console.log(`🎣 [${CONTAINER_ROLE}] Received product webhook:`, req.body);
    
    // Validate webhook data
    if (!req.body.eventType || !req.body.productData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook data: eventType and productData required'
      });
    }
    
    // Publish to Kafka
    await publishMessage('product-events', {
      eventType: req.body.eventType,
      productData: req.body.productData,
      source: 'external_webhook',
      container: CONTAINER_ROLE,
      timestamp: Date.now()
    }, `product-${req.body.productData.id || Date.now()}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Product webhook received and queued for processing',
      container: CONTAINER_ROLE
    });
  } catch (error) {
    console.error('❌ Error processing product webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Webhook processing failed',
      error: error.message 
    });
  }
});

// Member webhook - รับข้อมูล member จาก external API
app.post('/webhook/member', async (req, res) => {
  try {
    console.log(`🎣 [${CONTAINER_ROLE}] Received member webhook:`, req.body);
    
    // Validate webhook data
    if (!req.body.eventType || !req.body.memberData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook data: eventType and memberData required'
      });
    }
    
    // Publish to Kafka
    await publishMessage('member-events', {
      eventType: req.body.eventType,
      memberData: req.body.memberData,
      source: 'external_webhook',
      container: CONTAINER_ROLE,
      timestamp: Date.now()
    }, `member-${req.body.memberData.id || Date.now()}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Member webhook received and queued for processing',
      container: CONTAINER_ROLE
    });
  } catch (error) {
    console.error('❌ Error processing member webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Webhook processing failed',
      error: error.message 
    });
  }
});

// Generic webhook endpoint
app.post('/webhook/:type', async (req, res) => {
  try {
    const { type } = req.params;
    console.log(`🎣 [${CONTAINER_ROLE}] Received ${type} webhook:`, req.body);
    
    const validTypes = ['product', 'member', 'prescription', 'pharma'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid webhook type. Supported: ${validTypes.join(', ')}`
      });
    }
    
    // Publish to Kafka
    await publishMessage(`${type}-events`, {
      eventType: req.body.eventType || 'WEBHOOK',
      data: req.body,
      source: 'external_webhook',
      container: CONTAINER_ROLE,
      timestamp: Date.now()
    });
    
    res.status(200).json({ 
      success: true, 
      message: `${type} webhook received successfully`,
      container: CONTAINER_ROLE
    });
  } catch (error) {
    console.error(`❌ Error processing ${type} webhook:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Webhook processing failed',
      error: error.message 
    });
  }
});

// ===================================
// EXISTING API DOCUMENTATION
// ===================================
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Drug Label API v1.0 with Kafka Integration',
    container: CONTAINER_ROLE,
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
          'GET /api/products/low-stock - Get low stock products',
          'GET /api/products/stats - Get product statistics',
          'POST /api/products - Create new product (protected)',
          'PUT /api/products/:id - Update product (protected)',
          'DELETE /api/products/:id - Delete product (protected)'
        ]
      },
      webhooks: {
        base: '/webhook',
        description: 'External API integration endpoints',
        endpoints: [
          'POST /webhook/product - Receive product updates from external APIs',
          'POST /webhook/member - Receive member updates from external APIs',
          'POST /webhook/:type - Generic webhook endpoint'
        ]
      },
      internal: {
        base: '/api/internal',
        description: 'Internal communication between containers',
        endpoints: [
          'POST /api/internal/product - Process product data internally',
          'POST /api/internal/member - Process member data internally'
        ]
      }
    },
    kafka: {
      enabled: true,
      container_role: CONTAINER_ROLE,
      topics: (process.env.KAFKA_TOPICS || 'product-events,member-events').split(',')
    }
  });
});

// Handle 404
app.use(notFound);

// Error handling middleware (ต้องอยู่ท้ายสุด)
app.use(errorHandler);

// ===================================
// KAFKA SETUP และ SERVER STARTUP
// ===================================
const startServer = async () => {
  try {
    console.log(`🚀 Starting server in ${CONTAINER_ROLE} mode...`);
    
    // เชื่อมต่อ Kafka
    console.log('📡 Connecting to Kafka...');
    await connectKafka();
    
    // ตั้งค่า Kafka message handler
    const messageHandler = new KafkaMessageHandler();
    
    // Subscribe to topics
    const topics = (process.env.KAFKA_TOPICS || 'product-events,member-events').split(',');
    console.log(`📋 Subscribing to topics: ${topics.join(', ')}`);
    await subscribeToTopics(topics, (message) => messageHandler.processMessage(message));
    
    // เริ่ม Express server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} (${CONTAINER_ROLE} container)`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      console.log(`🎣 Webhooks: http://localhost:${PORT}/webhook/*`);
      console.log(`🔗 Internal APIs: http://localhost:${PORT}/api/internal/*`);
      console.log(`📡 Kafka topics: ${topics.join(', ')}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('🔒 HTTP server closed');
        
        try {
          await disconnectKafka();
          console.log('🔒 Kafka disconnected');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();