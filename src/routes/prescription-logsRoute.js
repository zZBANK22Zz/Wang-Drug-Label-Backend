// routes/prescription-logsRoute.js
const express = require('express');
const router = express.Router();
const PrescriptionLogsController = require('../controller/prescription-logsController');

// Middleware สำหรับตรวจสอบ Authentication (สมมุติว่ามีอยู่แล้ว)
// const authenticateToken = require('../middleware/index'); // ปรับตาม path ที่ถูกต้อง

// // สำหรับตอนนี้จะ comment middleware ไว้ก่อน สามารถ uncomment ได้เมื่อมี auth middleware
// router.use(authenticateToken);

/**
 * @route   POST /api/prescription-logs
 * @desc    สร้าง prescription log ใหม่
 * @access  Private (จำเป็นต้อง login)
 * @body    {
 *            mem_id: Number,
 *            product_id: Number,
 *            patient_name: String,
 *            product_name_snapshot: String,
 *            ... (ข้อมูลอื่นๆ ตาม model)
 *          }
 */
router.post('/prescription-logs', PrescriptionLogsController.createPrescriptionLog);

/**
 * @route   GET /api/prescription-logs/:id
 * @desc    ดึงข้อมูล prescription log เดียว
 * @access  Private
 * @params  id: Number (prescription log ID)
 */
router.get('/prescription-logs/:id', PrescriptionLogsController.getPrescriptionLogById);

/**
 * @route   GET /api/prescription-logs/member/:mem_id
 * @desc    ดึง prescription logs ของ member
 * @access  Private
 * @params  mem_id: Number (member ID)
 * @query   page: Number (หน้าที่ต้องการ, default: 1)
 *          limit: Number (จำนวนรายการต่อหน้า, default: 10, max: 100)
 */
router.get('/prescription-logs/member/:mem_id', PrescriptionLogsController.getPrescriptionLogsByMember);

/**
 * @route   GET /api/prescription-logs/search
 * @desc    ค้นหา prescription logs โดย patient name
 * @access  Private
 * @query   patient_name: String (ชื่อผู้ป่วยที่ต้องการค้นหา)
 *          page: Number (หน้าที่ต้องการ, default: 1)
 *          limit: Number (จำนวนรายการต่อหน้า, default: 10, max: 100)
 */
router.get('/prescription-logs/search', PrescriptionLogsController.searchPrescriptionLogs);

/**
 * @route   PATCH /api/prescription-logs/:id/pdf
 * @desc    อัปเดตข้อมูล PDF file
 * @access  Private
 * @params  id: Number (prescription log ID)
 * @body    {
 *            pdf_file_name: String,
 *            pdf_file_path: String (optional)
 *          }
 */
router.patch('/prescription-logs/:id/pdf', PrescriptionLogsController.updatePDFFile);

// Route สำหรับทดสอบ (สามารถลบได้เมื่อไม่ต้องการ)
router.get('/prescription-logs/health', (req, res) => {
  res.json({
    success: true,
    message: 'Prescription Logs API is working',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/prescription-logs',
      'GET /api/prescription-logs/:id',
      'GET /api/prescription-logs/member/:mem_id',
      'GET /api/prescription-logs/search',
      'PATCH /api/prescription-logs/:id/pdf'
    ]
  });
});

module.exports = router;