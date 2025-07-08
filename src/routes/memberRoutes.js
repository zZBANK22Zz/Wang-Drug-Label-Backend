const express = require('express');
const MemberController = require('../controller/memberController');

const router = express.Router();

// GET /api/members - ดึงข้อมูล member ทั้งหมด
router.get('/', MemberController.getAllMembers);

// GET /api/members/:id - ดึงข้อมูล member ตาม ID
router.get('/:id', MemberController.getMemberById);

// POST /api/members - เพิ่ม member ใหม่
router.post('/', MemberController.addMember);

// PUT /api/members/:id/picking-status - อัพเดท picking status
router.put('/:id/picking-status', MemberController.updatePickingStatus);

// PUT /api/members/:id - อัพเดทข้อมูล member
router.put('/:id', MemberController.updateMember);

// DELETE /api/members/:id - ลบ member ตาม ID
router.delete('/:id', MemberController.deleteMember);

module.exports = router;