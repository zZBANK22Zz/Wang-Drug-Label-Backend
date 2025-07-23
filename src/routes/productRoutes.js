const express = require('express');
const ProductController = require('../controller/productController');
const { authenticateToken } = require('../middleware');

const router = express.Router();

// ===================================
// Public routes (ไม่ต้อง login)
// ===================================

// GET /api/products - ดึงข้อมูล products ทั้งหมด (พร้อม filtering)
// Query parameters: search, drug_type, stock_status, min_price, max_price, min_rating, sort_by, sort_order, limit, offset
router.get('/', ProductController.getAllProducts);
router.post('/with-pharma', ProductController.addProductWithPharma);

// GET /api/products/test-db - ทดสอบการเชื่อมต่อ database
router.get('/test-db', ProductController.testDatabase);

// GET /api/products/stats - ดึงสถิติ products
router.get('/stats', ProductController.getProductStats);

// GET /api/products/low-stock - ดึงข้อมูล products ที่ stock ต่ำ
// Query parameters: threshold (default: 10)
router.get('/low-stock', ProductController.getLowStockProducts);

// GET /api/products/popular - ดึงข้อมูล products ยอดนิยม
// Query parameters: limit (default: 10)
router.get('/popular', ProductController.getPopularProducts);

// GET /api/products/drug-type/:drugType - ดึงข้อมูล products ตาม drug type
router.get('/drug-type/:drugType', ProductController.getProductsByDrugType);

// GET /api/products/barcode/:barcode - ดึงข้อมูล product ตาม barcode (รองรับ 3 barcode)
router.get('/barcode/:barcode', ProductController.getProductByBarcode);

// GET /api/products/code/:code - ดึงข้อมูล product ตาม product code
router.get('/code/:code', ProductController.getProductByCode);

// GET /api/products/:id - ดึงข้อมูล product ตาม ID
// Query parameters: increment_view (true/false)
router.get('/:id', ProductController.getProductById);

// ===================================
// Protected routes (ต้อง login)
// ===================================

// POST /api/products - เพิ่ม product ใหม่
// router.post('/', authenticateToken, ProductController.addProduct);
router.post('/', ProductController.addProduct);

// PUT /api/products/:id - อัพเดทข้อมูล product
router.put('/:id', authenticateToken, ProductController.updateProduct);

// PUT /api/products/:id/stock - อัพเดท stock สินค้า
// Body: { stock_change: number, operation: 'set'|'add'|'subtract' }
router.put('/:id/stock', authenticateToken, ProductController.updateStock);

// PUT /api/products/:id/rating - อัพเดท rating สินค้า
// Body: { rating: number (0-5) }
router.put('/:id/rating', authenticateToken, ProductController.updateRating);

// DELETE /api/products/:id - ลบ product
router.delete('/:id', authenticateToken, ProductController.deleteProduct);

module.exports = router;