// routes/pharma-verify.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Middleware สำหรับตรวจสอบ authentication (สมมติว่ามีอยู่แล้ว)
// const authMiddleware = require('../middleware/auth');
// router.use(authMiddleware);

// ==========================================
// POST: ส่งข้อมูลเพื่อ Verify
// ==========================================
router.post('/pharma-verify', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      mem_id,
      product_id,
      pp_procode,
      verify_type,  // 'global' หรือ 'personal'
      updated_data,
      original_data
    } = req.body;

    // ตรวจสอบข้อมูลจำเป็น
    if (!mem_id || !pp_procode || !verify_type || !updated_data) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน: จำเป็นต้องมี mem_id, pp_procode, verify_type, และ updated_data'
      });
    }

    // ตรวจสอบ verify_type
    if (!['global', 'personal'].includes(verify_type)) {
      return res.status(400).json({
        success: false,
        message: 'verify_type ต้องเป็น global หรือ personal เท่านั้น'
      });
    }

    // ตรวจสอบว่า member มีอยู่หรือไม่
    const memberCheck = await client.query(
      'SELECT mem_id FROM member WHERE mem_id = $1',
      [mem_id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบข้อมูลสมาชิก'
      });
    }

    // ตรวจสอบว่ามี product pharma อยู่หรือไม่
    const pharmaCheck = await client.query(
      'SELECT pp_id FROM product_pharma WHERE pp_procode = $1',
      [pp_procode]
    );

    if (pharmaCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบข้อมูล pharma สำหรับรหัสสินค้านี้'
      });
    }

    // บันทึกข้อมูลการ verify
    const insertQuery = `
      INSERT INTO product_pharma_verify (
        mem_id,
        product_id,
        pp_procode,
        verify_type,
        updated_data,
        original_data,
        status,
        submission_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING id, status, submission_date
    `;

    const values = [
      mem_id,
      product_id || null,
      pp_procode,
      verify_type,
      JSON.stringify(updated_data),
      JSON.stringify(original_data || {}),
      'pending'
    ];

    const result = await client.query(insertQuery, values);
    const newVerifyRequest = result.rows[0];

    // Log การส่งข้อมูล
    console.log(`✅ สร้างการ verify ใหม่: ID ${newVerifyRequest.id}, Type: ${verify_type}, Member: ${mem_id}`);

    res.status(201).json({
      success: true,
      message: 'ส่งข้อมูลเพื่อตรวจสอบสำเร็จ',
      data: {
        id: newVerifyRequest.id,
        status: newVerifyRequest.status,
        verify_type: verify_type,
        submission_date: newVerifyRequest.submission_date
      }
    });

  } catch (error) {
    console.error('❌ Error in POST /pharma-verify:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// ==========================================
// GET: ดึงข้อมูลการ Verify ตาม ID
// ==========================================
router.get('/pharma-verify/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // ตรวจสอบ ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID ไม่ถูกต้อง'
      });
    }

    // ดึงข้อมูลการ verify พร้อม join ข้อมูล member
    const query = `
      SELECT 
        pv.*,
        m.mem_namesite as submitter_name,
        reviewer.mem_namesite as reviewer_name,
        pp.pp_properties as current_global_properties
      FROM product_pharma_verify pv
      JOIN member m ON pv.mem_id = m.mem_id
      LEFT JOIN member reviewer ON pv.reviewed_by = reviewer.mem_id
      LEFT JOIN product_pharma pp ON pv.pp_procode = pp.pp_procode
      WHERE pv.id = $1
    `;

    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการตรวจสอบ'
      });
    }

    const verifyData = result.rows[0];

    // แปลง JSON strings กลับเป็น objects
    verifyData.updated_data = JSON.parse(verifyData.updated_data);
    verifyData.original_data = verifyData.original_data ? JSON.parse(verifyData.original_data) : {};

    res.json({
      success: true,
      data: verifyData
    });

  } catch (error) {
    console.error('❌ Error in GET /pharma-verify/:id:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// ==========================================
// GET: ดึงรายการการ Verify ทั้งหมด (สำหรับ Admin หรือ User ตัวเอง)
// ==========================================
router.get('/pharma-verify', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      mem_id,           // ดูเฉพาะของ member นี้
      status,           // filter ตาม status
      verify_type,      // filter ตาม type
      page = 1,         // pagination
      limit = 10 
    } = req.query;

    // สร้าง WHERE conditions
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (mem_id) {
      paramCount++;
      whereConditions.push(`pv.mem_id = $${paramCount}`);
      queryParams.push(mem_id);
    }

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      paramCount++;
      whereConditions.push(`pv.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (verify_type && ['global', 'personal'].includes(verify_type)) {
      paramCount++;
      whereConditions.push(`pv.verify_type = $${paramCount}`);
      queryParams.push(verify_type);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // คำนวณ pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    queryParams.push(parseInt(limit));
    paramCount++;
    queryParams.push(offset);

    // Query หลัก
    const query = `
      SELECT 
        pv.id,
        pv.mem_id,
        pv.pp_procode,
        pv.verify_type,
        pv.status,
        pv.submission_date,
        pv.reviewed_at,
        pv.rejection_reason,
        m.mem_namesite as submitter_name,
        reviewer.mem_namesite as reviewer_name,
        p.pro_name
      FROM product_pharma_verify pv
      JOIN member m ON pv.mem_id = m.mem_id
      LEFT JOIN member reviewer ON pv.reviewed_by = reviewer.mem_id
      LEFT JOIN product p ON pv.pp_procode = p.pro_code
      ${whereClause}
      ORDER BY pv.submission_date DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    // Count query สำหรับ pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM product_pharma_verify pv
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      client.query(query, queryParams),
      client.query(countQuery, queryParams.slice(0, -2)) // เอา limit และ offset ออก
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_records: total,
        records_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error in GET /pharma-verify:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// ==========================================
// PATCH: อัปเดตสถานะการ Verify (สำหรับ Admin)
// ==========================================
router.patch('/pharma-verify/:id/status', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { action, rejection_reason, reviewed_by } = req.body;

    // ตรวจสอบข้อมูล
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action ต้องเป็น approve หรือ reject'
      });
    }

    if (action === 'reject' && !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'จำเป็นต้องระบุเหตุผลการปฏิเสธ'
      });
    }

    // ดึงข้อมูลการ verify
    const verifyResult = await client.query(
      'SELECT * FROM product_pharma_verify WHERE id = $1',
      [id]
    );

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการตรวจสอบ'
      });
    }

    const verifyRequest = verifyResult.rows[0];

    if (verifyRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'การตรวจสอบนี้ได้รับการพิจารณาแล้ว'
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // อัปเดตสถานะการ verify
    await client.query(`
      UPDATE product_pharma_verify 
      SET 
        status = $1, 
        reviewed_by = $2, 
        reviewed_at = CURRENT_TIMESTAMP,
        rejection_reason = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [newStatus, reviewed_by, rejection_reason || null, id]);

    // ถ้าอนุมัติ ให้อัปเดตข้อมูลจริง
    if (action === 'approve') {
      const updatedData = JSON.parse(verifyRequest.updated_data);
      
      if (verifyRequest.verify_type === 'global') {
        // อัปเดตข้อมูล Global
        await updateGlobalPharmaData(client, verifyRequest.pp_procode, updatedData);
      } else {
        // อัปเดตข้อมูล Personal
        await updatePersonalPharmaData(client, verifyRequest.mem_id, verifyRequest.pp_procode, updatedData);
      }
    }

    await client.query('COMMIT');

    console.log(`✅ ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'} การ verify ID: ${id}`);

    res.json({
      success: true,
      message: `${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}การตรวจสอบสำเร็จ`,
      data: {
        id: parseInt(id),
        status: newStatus,
        reviewed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in PATCH /pharma-verify/:id/status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// ==========================================
// Helper Functions
// ==========================================

// อัปเดตข้อมูล Global Pharma
async function updateGlobalPharmaData(client, pp_procode, updatedData) {
  const updateFields = [];
  const values = [pp_procode];
  let paramCount = 1;

  Object.entries(updatedData).forEach(([key, value]) => {
    if (key.startsWith('pp_')) {
      paramCount++;
      updateFields.push(`${key} = $${paramCount}`);
      values.push(value);
    }
  });

  if (updateFields.length > 0) {
    const query = `
      UPDATE product_pharma 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE pp_procode = $1
    `;
    
    await client.query(query, values);
    console.log(`✅ อัปเดตข้อมูล Global pharma: ${pp_procode}`);
  }
}

// อัปเดตข้อมูล Personal Pharma
async function updatePersonalPharmaData(client, mem_id, pp_procode, updatedData) {
  const insertFields = ['mem_id', 'pp_procode'];
  const insertValues = [mem_id, pp_procode];
  const insertPlaceholders = ['$1', '$2'];
  const updateFields = [];
  let paramCount = 2;

  Object.entries(updatedData).forEach(([key, value]) => {
    if (key.startsWith('pp_')) {
      paramCount++;
      insertFields.push(key);
      insertValues.push(value);
      insertPlaceholders.push(`$${paramCount}`);
      updateFields.push(`${key} = $${paramCount}`);
    }
  });

  if (updateFields.length > 0) {
    const query = `
      INSERT INTO product_pharma_personal (${insertFields.join(', ')})
      VALUES (${insertPlaceholders.join(', ')})
      ON CONFLICT (mem_id, pp_procode) 
      DO UPDATE SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    `;
    
    await client.query(query, insertValues);
    console.log(`✅ อัปเดตข้อมูล Personal pharma: Member ${mem_id}, Product ${pp_procode}`);
  }
}

async function addPersonalPharmaData(mem_id, pp_code, updated_data) {
  
}

module.exports = router;