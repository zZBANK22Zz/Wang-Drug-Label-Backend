// models/pharmaPersonalModel.js
const pool = require('../config/database'); // สมมติว่ามี database config

class PharmaPersonalModel {
  // สร้างหรืออัปเดตข้อมูล pharma personal
  static async createOrUpdate(data) {
    const {
      mem_id,
      pp_procode,
      pp_eatamount,
      pp_daypamount,
      pp_preservation,
      pp_contraindications,
      pp_use_in_pregnant_women,
      pp_use_in_lactating_women,
      pp_side_effects,
      pp_other_dangerous_reactions,
      pp_other5,
      pp_eatunit,
      pp_note,
      pp_othereat,
      pp_before_after_meals,
      pp_step1,
      pp_step2,
      pp_step3,
      pp_step4,
      pp_step5,
      pp_suggestion,
      pp_other1,
      pp_other2,
      pp_other3,
      pp_other4,
      pp_properties,
      pp_how_to_use,
      pp_caution
    } = data;

    try {
      // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
      const existingQuery = `
        SELECT id FROM product_pharma_personal 
        WHERE mem_id = $1 AND pp_procode = $2
      `;
      const existingResult = await pool.query(existingQuery, [mem_id, pp_procode]);

      if (existingResult.rows.length > 0) {
        // อัปเดตข้อมูลที่มีอยู่
        const updateQuery = `
          UPDATE product_pharma_personal SET 
            pp_eatamount = $3,
            pp_daypamount = $4,
            pp_preservation = $5,
            pp_contraindications = $6,
            pp_use_in_pregnant_women = $7,
            pp_use_in_lactating_women = $8,
            pp_side_effects = $9,
            pp_other_dangerous_reactions = $10,
            pp_other5 = $11,
            pp_eatunit = $12,
            pp_note = $13,
            pp_othereat = $14,
            pp_before_after_meals = $15,
            pp_step1 = $16,
            pp_step2 = $17,
            pp_step3 = $18,
            pp_step4 = $19,
            pp_step5 = $20,
            pp_suggestion = $21,
            pp_other1 = $22,
            pp_other2 = $23,
            pp_other3 = $24,
            pp_other4 = $25,
            pp_properties = $26,
            pp_how_to_use = $27,
            pp_caution = $28,
            updated_at = NOW()
          WHERE mem_id = $1 AND pp_procode = $2
          RETURNING *
        `;

        const updateValues = [
          mem_id, pp_procode, pp_eatamount, pp_daypamount, pp_preservation,
          pp_contraindications, pp_use_in_pregnant_women, pp_use_in_lactating_women,
          pp_side_effects, pp_other_dangerous_reactions, pp_other5, pp_eatunit,
          pp_note, pp_othereat, pp_before_after_meals, pp_step1, pp_step2,
          pp_step3, pp_step4, pp_step5, pp_suggestion, pp_other1, pp_other2,
          pp_other3, pp_other4, pp_properties, pp_how_to_use, pp_caution
        ];

        const result = await pool.query(updateQuery, updateValues);
        return {
          success: true,
          action: 'updated',
          data: result.rows[0]
        };

      } else {
        // สร้างข้อมูลใหม่
        const insertQuery = `
          INSERT INTO product_pharma_personal (
            mem_id, pp_procode, pp_eatamount, pp_daypamount, pp_preservation,
            pp_contraindications, pp_use_in_pregnant_women, pp_use_in_lactating_women,
            pp_side_effects, pp_other_dangerous_reactions, pp_other5, pp_eatunit,
            pp_note, pp_othereat, pp_before_after_meals, pp_step1, pp_step2,
            pp_step3, pp_step4, pp_step5, pp_suggestion, pp_other1, pp_other2,
            pp_other3, pp_other4, pp_properties, pp_how_to_use, pp_caution,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
            NOW(), NOW()
          ) RETURNING *
        `;

        const insertValues = [
          mem_id, pp_procode, pp_eatamount, pp_daypamount, pp_preservation,
          pp_contraindications, pp_use_in_pregnant_women, pp_use_in_lactating_women,
          pp_side_effects, pp_other_dangerous_reactions, pp_other5, pp_eatunit,
          pp_note, pp_othereat, pp_before_after_meals, pp_step1, pp_step2,
          pp_step3, pp_step4, pp_step5, pp_suggestion, pp_other1, pp_other2,
          pp_other3, pp_other4, pp_properties, pp_how_to_use, pp_caution
        ];

        const result = await pool.query(insertQuery, insertValues);
        return {
          success: true,
          action: 'created',
          data: result.rows[0]
        };
      }

    } catch (error) {
      console.error('Error in createOrUpdate:', error);
      throw error;
    }
  }

  // ดึงข้อมูล pharma personal ตาม mem_id และ pp_procode
  static async getByMemberAndProcode(mem_id, pp_procode) {
    try {
      const query = `
        SELECT * FROM product_pharma_personal 
        WHERE mem_id = $1 AND pp_procode = $2
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [mem_id, pp_procode]);
      
      return {
        success: true,
        data: result.rows.length > 0 ? result.rows[0] : null,
        found: result.rows.length > 0
      };

    } catch (error) {
      console.error('Error in getByMemberAndProcode:', error);
      throw error;
    }
  }

  // ดึงข้อมูล pharma personal ทั้งหมดของ member
  static async getAllByMember(mem_id) {
    try {
      const query = `
        SELECT * FROM product_pharma_personal 
        WHERE mem_id = $1
        ORDER BY updated_at DESC
      `;
      
      const result = await pool.query(query, [mem_id]);
      
      return {
        success: true,
        data: result.rows,
        count: result.rows.length
      };

    } catch (error) {
      console.error('Error in getAllByMember:', error);
      throw error;
    }
  }

  // ลบข้อมูล pharma personal
  static async delete(mem_id, pp_procode) {
    try {
      const query = `
        DELETE FROM product_pharma_personal 
        WHERE mem_id = $1 AND pp_procode = $2
        RETURNING *
      `;
      
      const result = await pool.query(query, [mem_id, pp_procode]);
      
      return {
        success: true,
        deleted: result.rows.length > 0,
        data: result.rows.length > 0 ? result.rows[0] : null
      };

    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  // ตรวจสอบว่ามีข้อมูลหรือไม่
  static async exists(mem_id, pp_procode) {
    try {
      const query = `
        SELECT COUNT(*) as count FROM product_pharma_personal 
        WHERE mem_id = $1 AND pp_procode = $2
      `;
      
      const result = await pool.query(query, [mem_id, pp_procode]);
      
      return {
        success: true,
        exists: parseInt(result.rows[0].count) > 0
      };

    } catch (error) {
      console.error('Error in exists:', error);
      throw error;
    }
  }
}

module.exports = PharmaPersonalModel;