const express = require('express');
const ProductPharmaController = require('../controller/productPharmaController');
const { authenticateToken } = require('../middleware');

const router = express.Router();

// ===================================
// Public routes (ไม่ต้อง login)
// ===================================

// GET /api/product-pharma - ดึงข้อมูล product_pharma ทั้งหมด (พร้อม filtering)
// Query parameters: search, pp_procode, sort_by, sort_order, limit, offset
router.get('/', ProductPharmaController.getAllProductPharma);

// GET /api/product-pharma/test-db - ทดสอบการเชื่อมต่อ database
router.get('/test-db', ProductPharmaController.testDatabase);

// GET /api/product-pharma/stats - ดึงสถิติ product_pharma
router.get('/stats', ProductPharmaController.getProductPharmaStats);

// GET /api/product-pharma/procode/:procode - ดึงข้อมูล product_pharma ตาม product code (รายการเดียว)
router.get('/procode/:procode', ProductPharmaController.getProductPharmaByProcode);

// GET /api/product-pharma/procode-all/:procode - ดึงข้อมูล product_pharma หลายรายการตาม product code
router.get('/procode-all/:procode', ProductPharmaController.getAllProductPharmaByProcode);

// GET /api/product-pharma/with-product/:procode - ดึงข้อมูล product พร้อมกับ product_pharma
router.get('/with-product/:procode', ProductPharmaController.getProductWithPharmaInfo);

// GET /api/product-pharma/:id - ดึงข้อมูล product_pharma ตาม ID
router.get('/:id', ProductPharmaController.getProductPharmaById);

// ===================================
// Protected routes (ต้อง login)
// ===================================

// POST /api/product-pharma - เพิ่ม product_pharma ใหม่
router.post('/', authenticateToken, ProductPharmaController.addProductPharma);

// PUT /api/product-pharma/:id - อัพเดทข้อมูล product_pharma
router.put('/:id', authenticateToken, ProductPharmaController.updateProductPharma);

// DELETE /api/product-pharma/:id - ลบ product_pharma
router.delete('/:id', authenticateToken, ProductPharmaController.deleteProductPharma);

// DELETE /api/product-pharma/procode/:procode - ลบ product_pharma ตาม product code
router.delete('/procode/:procode', authenticateToken, ProductPharmaController.deleteProductPharmaByProcode);

module.exports = router;