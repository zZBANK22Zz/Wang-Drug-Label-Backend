// routes/pharmaPersonalRoutes.js
const express = require('express');
const router = express.Router();
const PharmaPersonalController = require('../controller/pharmaPersonalController');

// Middleware สำหรับตรวจสอบ Authentication (ถ้ามี)
const { authenticateToken } = require('../middleware');; // สมมติว่ามี middleware นี้

// POST - สร้างหรืออัปเดตข้อมูล pharma personal
// Endpoint: POST /api/pharma-personal
router.post('/', authenticateToken, PharmaPersonalController.createOrUpdate);

// GET - ดึงข้อมูล pharma personal ตาม mem_id และ pp_procode
// Endpoint: GET /api/pharma-personal/:mem_id/:pp_procode
router.get('/:mem_id/:pp_procode', authenticateToken, PharmaPersonalController.getByMemberAndProcode);

// GET - ดึงข้อมูล pharma personal ทั้งหมดของ member
// Endpoint: GET /api/pharma-personal/member/:mem_id
router.get('/member/:mem_id', authenticateToken, PharmaPersonalController.getAllByMember);

// PUT - อัปเดตข้อมูลเฉพาะบางฟิลด์
// Endpoint: PUT /api/pharma-personal/:mem_id/:pp_procode
router.put('/:mem_id/:pp_procode', authenticateToken, PharmaPersonalController.updateFields);

// DELETE - ลบข้อมูล pharma personal
// Endpoint: DELETE /api/pharma-personal/:mem_id/:pp_procode
router.delete('/:mem_id/:pp_procode', authenticateToken, PharmaPersonalController.delete);

module.exports = router;

// ========================================
// การใช้งานใน app.js หรือ server.js
// ========================================

/*
// ตอนเอาไปใช้ในไฟล์หลัก (app.js หรือ server.js)
const express = require('express');
const pharmaPersonalRoutes = require('./routes/pharmaPersonalRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/pharma-personal', pharmaPersonalRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
*/

// ========================================
// API Endpoints Summary
// ========================================

/*
1. POST /api/pharma-personal
   - สร้างหรืออัปเดตข้อมูล pharma personal
   - Body: JSON object ที่มี mem_id, pp_procode และข้อมูลอื่นๆ
   - Response: ข้อมูลที่สร้างหรืออัปเดต

2. GET /api/pharma-personal/:mem_id/:pp_procode
   - ดึงข้อมูล pharma personal เฉพาะ
   - Parameters: mem_id (integer), pp_procode (string)
   - Response: ข้อมูล pharma personal หรือ 404 ถ้าไม่พบ

3. GET /api/pharma-personal/member/:mem_id
   - ดึงข้อมูล pharma personal ทั้งหมดของ member
   - Parameters: mem_id (integer)
   - Response: array ของข้อมูล pharma personal

4. PUT /api/pharma-personal/:mem_id/:pp_procode
   - อัปเดตข้อมูลเฉพาะบางฟิลด์
   - Parameters: mem_id (integer), pp_procode (string)
   - Body: JSON object ที่มีข้อมูลที่ต้องการอัปเดต
   - Response: ข้อมูลที่อัปเดตแล้ว

5. DELETE /api/pharma-personal/:mem_id/:pp_procode
   - ลบข้อมูล pharma personal
   - Parameters: mem_id (integer), pp_procode (string)
   - Response: ข้อมูลที่ถูกลบ
*/

// ========================================
// ตัวอย่างการใช้งาน Client Side
// ========================================

/*
// 1. สร้างข้อมูลใหม่
const createPharmaPersonal = async (data) => {
  try {
    const response = await fetch('/api/pharma-personal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mem_id: 1,
        pp_procode: 'PROD001',
        pp_properties: 'สรรพคุณของยา',
        pp_how_to_use: 'วิธีการใช้',
        pp_eatamount: 2,
        pp_daypamount: 3,
        pp_before_after_meals: 'after_meal',
        // ... ข้อมูลอื่นๆ
      })
    });
    
    const result = await response.json();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

// 2. ดึงข้อมูล
const getPharmaPersonal = async (mem_id, pp_procode) => {
  try {
    const response = await fetch(`/api/pharma-personal/${mem_id}/${pp_procode}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    console.log('Data:', result.data);
  } catch (error) {
    console.error('Error:', error);
  }
};

// 3. ดึงข้อมูลทั้งหมดของ member
const getAllPharmaPersonal = async (mem_id) => {
  try {
    const response = await fetch(`/api/pharma-personal/member/${mem_id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    console.log('All data:', result.data);
  } catch (error) {
    console.error('Error:', error);
  }
};
*/