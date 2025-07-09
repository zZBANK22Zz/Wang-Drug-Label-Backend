const pool = require("../config/database");
const bcrypt = require("bcryptjs");

class MemberModel {
  // สร้าง member ใหม่
  static async createMember(memberData) {
    const {
      mem_code,
      mem_name,
      province,
      emp_code,
      picking_status,
      mem_note,
      emp_code_picking,
      picking_time_start,
      picking_time_end,
      password, // เพิ่ม password สำหรับการ login
    } = memberData;

    // Validate picking_status - เฉพาะ 'pending' หรือ 'picking' เท่านั้น
    const validStatuses = ["pending", "picking"];
    const finalPickingStatus = picking_status || "pending"; // default เป็น pending

    if (!validStatuses.includes(finalPickingStatus)) {
      throw new Error(
        `Invalid picking_status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    // Hash password
    const hashedPass = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO members (
        mem_code, mem_name, province, emp_code, picking_status, 
        mem_note, emp_code_picking, picking_time_start, picking_time_end, password
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING mem_id, mem_code, mem_name, province, emp_code, picking_status, 
                mem_note, emp_code_picking, picking_time_start, picking_time_end,
                created_at, updated_at
    `;

    const values = [
      mem_code,
      mem_name,
      province,
      emp_code,
      finalPickingStatus,
      mem_note,
      emp_code_picking,
      picking_time_start,
      picking_time_end,
      hashedPass
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล member ทั้งหมด (ไม่รวม password)
  static async getAllMembers() {
    const query = `
      SELECT mem_id, mem_code, mem_name, province, emp_code, picking_status, 
             mem_note, emp_code_picking, picking_time_start, picking_time_end,
             created_at, updated_at
      FROM members 
      ORDER BY created_at DESC
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล member ตาม ID (ไม่รวม password)
  static async getMemberById(id) {
    const query = `
      SELECT mem_id, mem_code, mem_name, province, emp_code, picking_status, 
             mem_note, emp_code_picking, picking_time_start, picking_time_end,
             created_at, updated_at
      FROM members 
      WHERE mem_id = $1
    `;

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ตรวจสอบว่า mem_code ซ้ำหรือไม่
  static async checkMemberCodeExists(mem_code) {
    const query = "SELECT COUNT(*) FROM members WHERE mem_code = $1";

    try {
      const result = await pool.query(query, [mem_code]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // ตรวจสอบว่า mem_code ซ้ำหรือไม่ (ยกเว้น member คนปัจจุบัน) - เพิ่มฟังก์ชันนี้
  static async checkMemberCodeExistsForUpdate(mem_code, exclude_mem_id) {
    const query = 'SELECT COUNT(*) FROM members WHERE mem_code = $1 AND mem_id != $2';
    
    try {
      const result = await pool.query(query, [mem_code, exclude_mem_id]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // อัพเดท picking status
  static async updatePickingStatus(mem_id, picking_status, emp_code_picking) {
    // Validate picking_status - เฉพาะ 'pending' หรือ 'picking' เท่านั้น
    const validStatuses = ["pending", "picking"];

    if (!validStatuses.includes(picking_status)) {
      throw new Error(
        `Invalid picking_status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    // กำหนด picking_time_start ตาม business logic
    let picking_time_start;
    if (picking_status === "picking") {
      // ถ้าเป็น picking ให้ set เป็น current timestamp
      picking_time_start = new Date().toISOString();
    } else if (picking_status === "pending") {
      // ถ้าเป็น pending ให้ set เป็น null
      picking_time_start = null;
    }

    const query = `
      UPDATE members 
      SET picking_status = $1, 
          emp_code_picking = $2,
          picking_time_start = $3,
          picking_time_end = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE mem_id = $4 
      RETURNING mem_id, mem_code, mem_name, province, emp_code, picking_status, 
                mem_note, emp_code_picking, picking_time_start, picking_time_end,
                created_at, updated_at
    `;

    try {
      const result = await pool.query(query, [
        picking_status,
        emp_code_picking,
        picking_time_start,
        mem_id,
      ]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // อัพเดทข้อมูล member (แก้ไขชื่อฟังก์ชัน)
  static async updateMember(mem_id, updateData) {
    const { mem_code, mem_name, province, emp_code, mem_note, password } = updateData;

    // Hash password ถ้ามีการส่งมา
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // ใช้ COALESCE เพื่อ update เฉพาะฟิลด์ที่ส่งมา
    const query = `
      UPDATE members 
      SET 
        mem_code = COALESCE($1, mem_code),
        mem_name = COALESCE($2, mem_name),
        province = COALESCE($3, province),
        emp_code = COALESCE($4, emp_code),
        mem_note = COALESCE($5, mem_note),
        password = COALESCE($6, password),
        updated_at = CURRENT_TIMESTAMP
      WHERE mem_id = $7
      RETURNING mem_id, mem_code, mem_name, province, emp_code, picking_status, 
                mem_note, emp_code_picking, picking_time_start, picking_time_end,
                created_at, updated_at
    `;

    const values = [
      mem_code || null,
      mem_name || null,
      province || null,
      emp_code || null,
      mem_note || null,
      hashedPassword || null,
      mem_id,
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ลบ member (แก้ไขชื่อฟังก์ชัน)
  static async deleteMember(mem_id) {
    const query = `
      DELETE FROM members 
      WHERE mem_id = $1 
      RETURNING mem_id, mem_code, mem_name, province, emp_code, picking_status, 
                mem_note, emp_code_picking, picking_time_start, picking_time_end,
                created_at, updated_at
    `;

    try {
      const result = await pool.query(query, [mem_id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  /*=============================================
                      Login member
  =============================================*/
  static async loginMember(mem_code, password) {
    const query = "SELECT * FROM members WHERE mem_code = $1";
    
    try {
      const result = await pool.query(query, [mem_code]);
      const member = result.rows[0];

      if (!member) {
        throw new Error("Member not found");
      }

      // ตรวจสอบ password
      const isMatch = await bcrypt.compare(password, member.password);
      if (!isMatch) {
        throw new Error("Invalid password");
      }

      // ลบ password ก่อนส่งกลับ
      const { password: _, ...memberWithoutPassword } = member;
      return memberWithoutPassword;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = MemberModel;