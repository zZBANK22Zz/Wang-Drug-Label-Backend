const express = require('express');
const MemberController = require('../controller/memberController');
const { authenticateToken } = require('../middleware'); // เพิ่ม middleware

const router = express.Router();

// Public routes (ไม่ต้อง login)
// POST /api/members - เพิ่ม member ใหม่ (Register)
router.post('/', MemberController.addMember);

// POST /api/members/login - Login member (ต้องอยู่ก่อน dynamic routes)
router.post('/login', MemberController.loginMember);

// GET /api/members - ดึงข้อมูล member ทั้งหมด
router.get('/', MemberController.getAllMembers);

// Protected routes (ต้อง login)
// GET /api/members/:id - ดึงข้อมูล member ตาม ID
router.get('/:id', authenticateToken, MemberController.getMemberById);

// PUT /api/members/:id - อัพเดทข้อมูล member
router.put('/:id', authenticateToken, MemberController.updateMember);

// PUT /api/members/:id/picking-status - อัพเดท picking status
router.put('/:id/picking-status', authenticateToken, MemberController.updatePickingStatus);

// DELETE /api/members/:id - ลบ member ตาม ID
router.delete('/:id', authenticateToken, MemberController.deleteMember);

module.exports = router;