const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ===================================
// 🔧 Environment Variables Setup
// ===================================
const PORT = process.env.PORT || 3000;
const CONTAINER_ROLE = process.env.CONTAINER_ROLE || "main";

// 🔇 Silence KafkaJS warnings
process.env.KAFKAJS_NO_PARTITIONER_WARNING = "1";

console.log(`🏷️ Container Role: ${CONTAINER_ROLE}`);
console.log(`🌐 Port: ${PORT}`);
console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔗 Kafka Brokers: ${process.env.KAFKA_BROKERS || "kafka:29092"}`);

// Import routes และ middleware
const memberRoutes = require("./src/routes/memberRoutes");
const productRoutes = require("./src/routes/productRoutes");
const prescriptionLogsRoute = require("./src/routes/prescription-logsRoute");
const productPharmaRoutes = require("./src/routes/productPharmaRoutes");
const internalRoutes = require("./src/routes/internalRoutes"); // 🆕 Internal routes
const {
  requestLogger,
  errorHandler,
  notFound,
  validateJSON,
} = require("./src/middleware");
const pharmaVerify = require("./src/routes/pharma-verify");
const pharmaPersonalRoutes = require("./src/routes/pharmaPersonalRoutes");
const KafkaConsumer = require("./src/services/kafkaConsumer");

const app = express();

// Middleware
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:3000"].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(validateJSON);
app.use(requestLogger);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: `${CONTAINER_ROLE} backend is running`,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    container: CONTAINER_ROLE,
    services: {
      members: "active",
      products: "active",
      kafka: KafkaConsumer ? "available" : "disabled",
    },
  });
});

// API Routes
app.use("/api/members", memberRoutes);
app.use("/api/products", productRoutes);
app.use("/api", prescriptionLogsRoute);
app.use("/api", productPharmaRoutes);
app.use("/api", pharmaVerify);
app.use("/api/pharma-personal", pharmaPersonalRoutes);
app.use("/api/internal", internalRoutes); // 🆕 Internal API routes

// API Documentation endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: `Drug Label API v1.0 (${CONTAINER_ROLE} Backend)`,
    container: CONTAINER_ROLE,
    endpoints: {
      members: {
        base: "/api/members",
        description: "Member management system",
        endpoints: [
          "GET /api/members - Get all members",
          "GET /api/members/:id - Get member by ID",
          "POST /api/members - Create new member (register)",
          "POST /api/members/login - Login member",
          "PUT /api/members/:id - Update member (protected)",
          "PUT /api/members/:id/picking-status - Update picking status (protected)",
          "DELETE /api/members/:id - Delete member (protected)",
        ],
      },
      products: {
        base: "/api/products",
        description: "Product and inventory management system",
        endpoints: [
          "GET /api/products - Get all products (with filtering)",
          "GET /api/products/:id - Get product by ID",
          "GET /api/products/code/:code - Get product by code",
          "GET /api/products/barcode/:barcode - Get product by barcode",
          "GET /api/products/low-stock - Get low stock products",
          "GET /api/products/stats - Get product statistics",
          "POST /api/products - Create new product (protected)",
          "POST /api/products/with-pharma - Create product with pharma",
          "PUT /api/products/:id - Update product (protected)",
          "PUT /api/products/:id/with-pharma - Update product with pharma",
          "PUT /api/products/:id/stock - Update product stock (protected)",
          "DELETE /api/products/:id - Delete product (protected)",
        ],
      },
      kafka: {
        description: "Event-driven processing via Kafka",
        topics: [
          "product-events",
          "member-events",
          "prescription-events",
          "pharma-events",
        ],
        containerRole: CONTAINER_ROLE,
        status: KafkaConsumer ? "available" : "disabled",
      },
    },
  });
});

// Handle 404
app.use(notFound);

// Error handling middleware (ต้องอยู่ท้ายสุด)
app.use(errorHandler);

// ===================================
// 🆕 Kafka Consumer Setup
// ===================================
let kafkaConsumer;

const startKafkaConsumer = async () => {
  // Skip if Kafka Consumer not available
  if (!KafkaConsumer) {
    console.log("⏭️ Skipping Kafka consumer - module not available");
    return;
  }

  try {
    console.log(`🚀 Starting Kafka consumer for ${CONTAINER_ROLE} backend...`);
    kafkaConsumer = new KafkaConsumer();
    await kafkaConsumer.startConsumer();
  } catch (error) {
    console.error(`❌ Failed to start Kafka consumer:`, error.message);
    console.log(`🔄 Will retry Kafka connection in 10 seconds...`);
    // Don't crash the server if Kafka fails
    setTimeout(startKafkaConsumer, 10000); // Retry after 10 seconds
  }
};

// ===================================
// Start Server
// ===================================
const server = app.listen(PORT, () => {
  console.log(`🚀 ${CONTAINER_ROLE} Backend server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`👥 Members API: http://localhost:${PORT}/api/members`);
  console.log(`📦 Products API: http://localhost:${PORT}/api/products`);

  // Start Kafka consumer after server is ready
  setTimeout(startKafkaConsumer, 3000); // Wait 3 seconds for server to be ready
});

// ===================================
// Graceful Shutdown
// ===================================
const gracefulShutdown = async (signal) => {
  console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    server.close(() => {
      console.log("🚪 HTTP server closed");
    });

    // Stop Kafka consumer (if exists)
    if (kafkaConsumer && typeof kafkaConsumer.stopConsumer === "function") {
      await kafkaConsumer.stopConsumer();
      console.log("📡 Kafka consumer stopped");
    } else {
      console.log("⏭️ No Kafka consumer to stop");
    }

    console.log("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});
