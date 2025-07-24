const pool = require("../config/database");
const bcrypt = require("bcryptjs");

class MemberModel {
  // สร้าง member ใหม่ (Updated for new table structure)
  static async createMember(memberData) {
    const {
      mem_username,
      mem_password, 
      mem_nameSite,
      mem_license,
      mem_type,
      mem_province,
      mem_address,
      mem_amphur,
      mem_tumbon,
      mem_post,
      mem_taxid,
      mem_office,
      mem_daystart,
      mem_dayend,
      mem_timestart,
      mem_timeend,
      mem_price,
      mem_comments
    } = memberData;

    // Validate required fields
    if (!mem_username || !mem_password) {
      throw new Error("Username and password are required");
    }

    // สร้าง mem_code อัตโนมัติด้วย Sequence
    const mem_code = await this.generateMemCode();

    // Hash password
    const hashedPassword = await bcrypt.hash(mem_password, 10);

    const query = `
      INSERT INTO member (
        mem_code, mem_username, mem_password, mem_nameSite, mem_license,
        mem_type, mem_province, mem_address, mem_amphur, mem_tumbon,
        mem_post, mem_taxid, mem_office, mem_daystart, mem_dayend,
        mem_timestart, mem_timeend, mem_price, mem_comments
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
      RETURNING mem_id, mem_code, mem_username, mem_nameSite, mem_license,
                mem_type, mem_province, mem_address, mem_amphur, mem_tumbon,
                mem_post, mem_taxid, mem_office, mem_daystart, mem_dayend,
                mem_timestart, mem_timeend, mem_price, mem_comments
    `;

    const values = [
      mem_code,
      mem_username,
      hashedPassword,
      mem_nameSite || null,
      mem_license || null,
      mem_type || 1,
      mem_province || null,
      mem_address || null,
      mem_amphur || null,
      mem_tumbon || null,
      mem_post || null,
      mem_taxid || null,
      mem_office || '0',
      mem_daystart || null,
      mem_dayend || null,
      mem_timestart || null,
      mem_timeend || null,
      mem_price || null,
      mem_comments || null
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // สร้าง mem_code ด้วย Sequence (เหมือนเดิม)
  static async generateMemCode() {
    try {
      const query = `
        SELECT CONCAT('MEM', LPAD(nextval('mem_code_seq')::text, 4, '0')) as new_code
      `;
      const result = await pool.query(query);
      return result.rows[0].new_code;
    } catch (error) {
      console.error("Error generating mem_code:", error);
      throw new Error("ไม่สามารถสร้าง member code ได้");
    }
  }

  // ดึงข้อมูล member ทั้งหมด (ไม่รวม password)
  static async getAllMembers() {
    const query = `
      SELECT mem_id, mem_code, mem_username, mem_nameSite, mem_license,
             mem_type, mem_province, mem_address, mem_amphur, mem_tumbon,
             mem_post, mem_taxid, mem_office, mem_daystart, mem_dayend,
             mem_timestart, mem_timeend, mem_price, mem_comments
      FROM member 
      ORDER BY mem_id DESC
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
      SELECT mem_id, mem_code, mem_username, mem_nameSite, mem_license,
             mem_type, mem_province, mem_address, mem_amphur, mem_tumbon,
             mem_post, mem_taxid, mem_office, mem_daystart, mem_dayend,
             mem_timestart, mem_timeend, mem_price, mem_comments
      FROM member 
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
    const query = "SELECT COUNT(*) FROM member WHERE mem_code = $1";

    try {
      const result = await pool.query(query, [mem_code]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // ตรวจสอบว่า mem_username ซ้ำหรือไม่
  static async checkUsernameExists(mem_username) {
    const query = "SELECT COUNT(*) FROM member WHERE mem_username = $1";

    try {
      const result = await pool.query(query, [mem_username]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // ตรวจสอบว่า mem_code ซ้ำหรือไม่ (ยกเว้น member คนปัจจุบัน)
  static async checkMemberCodeExistsForUpdate(mem_code, exclude_mem_id) {
    const query = "SELECT COUNT(*) FROM member WHERE mem_code = $1 AND mem_id != $2";

    try {
      const result = await pool.query(query, [mem_code, exclude_mem_id]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // ตรวจสอบว่า mem_username ซ้ำหรือไม่ (ยกเว้น member คนปัจจุบัน)
  static async checkUsernameExistsForUpdate(mem_username, exclude_mem_id) {
    const query = "SELECT COUNT(*) FROM member WHERE mem_username = $1 AND mem_id != $2";

    try {
      const result = await pool.query(query, [mem_username, exclude_mem_id]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // อัพเดทข้อมูล member
  static async updateMember(mem_id, updateData) {
    try {
      // สร้าง dynamic query เฉพาะ fields ที่ส่งมา
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Define allowed fields for update
      const allowedFields = [
        'mem_username', 'mem_nameSite', 'mem_license', 'mem_type',
        'mem_province', 'mem_address', 'mem_amphur', 'mem_tumbon',
        'mem_post', 'mem_taxid', 'mem_office', 'mem_daystart', 
        'mem_dayend', 'mem_timestart', 'mem_timeend', 'mem_price', 
        'mem_comments', 'mem_password'
      ];

      // Build dynamic update query
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          if (field === 'mem_password') {
            // Hash password if updating
            const hashedPassword = await bcrypt.hash(updateData[field], 10);
            updateFields.push(`${field} = $${paramIndex++}`);
            values.push(hashedPassword);
          } else {
            updateFields.push(`${field} = $${paramIndex++}`);
            values.push(updateData[field]);
          }
        }
      }

      if (updateFields.length === 0) {
        throw new Error('ไม่มีข้อมูลที่จะอัพเดท');
      }

      // Add mem_id for WHERE clause
      values.push(mem_id);

      const query = `
        UPDATE member 
        SET ${updateFields.join(', ')}
        WHERE mem_id = $${paramIndex}
        RETURNING mem_id, mem_code, mem_username, mem_nameSite, mem_license,
                  mem_type, mem_province, mem_address, mem_amphur, mem_tumbon,
                  mem_post, mem_taxid, mem_office, mem_daystart, mem_dayend,
                  mem_timestart, mem_timeend, mem_price, mem_comments
      `;

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // อัพเดทเฉพาะข้อมูลที่อยู่
  static async updateAddress(mem_id, addressData) {
    const { mem_address, mem_village, mem_alley, mem_road, mem_amphur, mem_tumbon, mem_post, mem_province } = addressData;

    try {
      const query = `
        UPDATE member 
        SET mem_address = $1,
            mem_village = $2,
            mem_alley = $3,
            mem_road = $4,
            mem_amphur = $5,
            mem_tumbon = $6,
            mem_post = $7,
            mem_province = $8
        WHERE mem_id = $9
        RETURNING mem_id, mem_code, mem_username, mem_nameSite, mem_address,
                  mem_village, mem_alley, mem_road, mem_amphur, mem_tumbon,
                  mem_post, mem_province
      `;

      const values = [
        mem_address || null,
        mem_village || null,
        mem_alley || null,
        mem_road || null,
        mem_amphur || null,
        mem_tumbon || null,
        mem_post || null,
        mem_province || null,
        mem_id
      ];

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // ลบ member
  static async deleteMember(mem_id) {
    const query = `
      DELETE FROM member 
      WHERE mem_id = $1 
      RETURNING mem_id, mem_code, mem_username, mem_nameSite, mem_type
    `;

    try {
      const result = await pool.query(query, [mem_id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Login member (Updated)
  static async loginMember(username, password) {
    const query = "SELECT * FROM member WHERE mem_username = $1";

    try {
      const result = await pool.query(query, [username]);
      const member = result.rows[0];

      if (!member) {
        throw new Error("Member not found");
      }

      const isMatch = await bcrypt.compare(password, member.mem_password);
      if (!isMatch) {
        throw new Error("Invalid password");
      }

      // ลบ mem_password ก่อนส่งกลับ
      const { mem_password: _, ...memberWithoutPassword } = member;
      return memberWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  // Alternative: Login ด้วย mem_code
  static async loginMemberByCode(memberCode, password) {
    const query = "SELECT * FROM member WHERE mem_code = $1";

    try {
      const result = await pool.query(query, [memberCode]);
      const member = result.rows[0];

      if (!member) {
        throw new Error("Member not found");
      }

      const isMatch = await bcrypt.compare(password, member.mem_password);
      if (!isMatch) {
        throw new Error("Invalid password");
      }

      const { mem_password: _, ...memberWithoutPassword } = member;
      return memberWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  // ทดสอบการเชื่อมต่อและดูตาราง
  static async testConnection() {
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      console.log('✅ Database connected:', result.rows[0]);
      
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      console.log('📋 Available tables:', tables.rows.map(row => row.table_name));
      
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'member'
        ORDER BY ordinal_position
      `);
      
      if (columns.rows.length > 0) {
        console.log('🏗️ Member table columns:', columns.rows);
      }
      
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
    }
  }
}

module.exports = MemberModel;