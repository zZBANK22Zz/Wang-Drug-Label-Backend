const pool = require('../config/database');

class ProductPharmaModel {
  // ตรวจสอบ table structure
  static async getTableStructure() {
    try {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'product_pharma'
        ORDER BY ordinal_position
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // สร้าง product_pharma ใหม่ - รองรับ transaction
  static async createProductPharma(productPharmaData, client = null) {
    const dbClient = client || pool; // ใช้ client ที่ส่งมา หรือ pool ปกติ
    
    const {
      pp_procode,
      pp_eatamount,
      pp_daypamount,
      pp_eatunit,
      pp_before_after_meals,
      pp_step1,
      pp_step2,
      pp_step3,
      pp_step4,
      pp_step5,
      pp_other1,
      pp_other2,
      pp_other3,
      pp_other4,
      pp_other5,
      pp_print = 0,
      pp_properties,
      pp_how_to_use,
      pp_caution,
      pp_preservation,
      pp_contraindications,
      pp_use_in_pregnant_women,
      pp_use_in_lactating_women,
      pp_side_effects,
      pp_other_dangerous_reactions,
      pp_suggestion,
      pp_note,
      pp_othereat
    } = productPharmaData;

    const query = `
      INSERT INTO product_pharma (
        pp_procode, pp_eatamount, pp_daypamount, pp_eatunit, pp_before_after_meals,
        pp_step1, pp_step2, pp_step3, pp_step4, pp_step5,
        pp_other1, pp_other2, pp_other3, pp_other4, pp_other5,
        pp_print, pp_properties, pp_how_to_use, pp_caution, pp_preservation,
        pp_contraindications, pp_use_in_pregnant_women, pp_use_in_lactating_women,
        pp_side_effects, pp_other_dangerous_reactions, pp_suggestion, pp_note, pp_othereat
      ) 
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      ) 
      RETURNING *
    `;

    const values = [
      pp_procode, pp_eatamount || null, pp_daypamount || null, pp_eatunit || null,
      pp_before_after_meals || null, pp_step1 || null, pp_step2 || null, pp_step3 || null,
      pp_step4 || null, pp_step5 || null, pp_other1 || null, pp_other2 || null,
      pp_other3 || null, pp_other4 || null, pp_other5 || null, pp_print,
      pp_properties || null, pp_how_to_use || null, pp_caution || null, pp_preservation || null,
      pp_contraindications || null, pp_use_in_pregnant_women || null, pp_use_in_lactating_women || null,
      pp_side_effects || null, pp_other_dangerous_reactions || null, pp_suggestion || null,
      pp_note || null, pp_othereat || null
    ];

    try {
      console.log('🔍 Creating product pharma with:', {
        columnsCount: 28,
        valuesCount: values.length,
        pp_procode
      });
      
      const result = await dbClient.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Create product pharma error:', error.message);
      throw error;
    }
  }

  // ดึงข้อมูล product_pharma ทั้งหมด
  static async getAllProductPharma(filters = {}) {
    let query = 'SELECT * FROM product_pharma WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    // Search by product code
    if (filters.search) {
      query += ` AND (pp_procode ILIKE $${paramIndex} OR pp_properties ILIKE $${paramIndex} OR pp_note ILIKE $${paramIndex})`;
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Filter by product code
    if (filters.pp_procode) {
      query += ` AND pp_procode = $${paramIndex}`;
      values.push(filters.pp_procode);
      paramIndex++;
    }

    // Sorting
    const sortBy = filters.sort_by || 'pp_id';
    const sortOrder = filters.sort_order || 'DESC';
    const allowedSortFields = ['pp_id', 'pp_procode', 'pp_eatamount', 'pp_daypamount', 'pp_print'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'pp_id';
    query += ` ORDER BY ${finalSortBy} ${sortOrder}`;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(parseInt(filters.limit));
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(parseInt(filters.offset));
      paramIndex++;
    }

    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล product_pharma ตาม ID
  static async getProductPharmaById(id) {
    const query = 'SELECT * FROM product_pharma WHERE pp_id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล product_pharma ตาม product code
  static async getProductPharmaByProcode(pp_procode) {
    const query = 'SELECT * FROM product_pharma WHERE pp_procode = $1';
    
    try {
      const result = await pool.query(query, [pp_procode]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล product_pharma หลายรายการตาม product code
  static async getAllProductPharmaByProcode(pp_procode) {
    const query = 'SELECT * FROM product_pharma WHERE pp_procode = $1 ORDER BY pp_id';
    
    try {
      const result = await pool.query(query, [pp_procode]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // ตรวจสอบว่า product code มีข้อมูล pharma หรือไม่
  static async checkProductPharmaExists(pp_procode) {
    const query = 'SELECT COUNT(*) FROM product_pharma WHERE pp_procode = $1';
    
    try {
      const result = await pool.query(query, [pp_procode]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // อัพเดทข้อมูล product_pharma
  static async updateProductPharma(pp_id, updateData) {
    try {
      // สร้าง dynamic query เฉพาะ fields ที่ส่งมา
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Define allowed fields for update
      const allowedFields = [
        'pp_procode', 'pp_eatamount', 'pp_daypamount', 'pp_eatunit', 'pp_before_after_meals',
        'pp_step1', 'pp_step2', 'pp_step3', 'pp_step4', 'pp_step5',
        'pp_other1', 'pp_other2', 'pp_other3', 'pp_other4', 'pp_other5',
        'pp_print', 'pp_properties', 'pp_how_to_use', 'pp_caution', 'pp_preservation',
        'pp_contraindications', 'pp_use_in_pregnant_women', 'pp_use_in_lactating_women',
        'pp_side_effects', 'pp_other_dangerous_reactions', 'pp_suggestion', 'pp_note', 'pp_othereat'
      ];

      // Build dynamic update query
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex++}`);
          values.push(updateData[field]);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('ไม่มีข้อมูลที่จะอัพเดท');
      }

      // Add pp_id for WHERE clause
      values.push(pp_id);

      const query = `
        UPDATE product_pharma 
        SET ${updateFields.join(', ')}
        WHERE pp_id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // ลบ product_pharma
  static async deleteProductPharma(pp_id) {
    const query = 'DELETE FROM product_pharma WHERE pp_id = $1 RETURNING *';
    
    try {
      const result = await pool.query(query, [pp_id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ลบ product_pharma ตาม product code
  static async deleteProductPharmaByProcode(pp_procode) {
    const query = 'DELETE FROM product_pharma WHERE pp_procode = $1 RETURNING *';
    
    try {
      const result = await pool.query(query, [pp_procode]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล product พร้อมกับ product_pharma (JOIN)
// Updated ProductModel.js

static async getProductWithPharmaInfo(pro_code, mem_id = null) {
  try {
    // 1. ดึงข้อมูล Product + Global Pharma Data ก่อน
    const globalQuery = `
      SELECT 
        p.*,
        pp.pp_id,
        pp.pp_eatamount,
        pp.pp_daypamount,
        pp.pp_eatunit,
        pp.pp_before_after_meals,
        pp.pp_step1, pp.pp_step2, pp.pp_step3, pp.pp_step4, pp.pp_step5,
        pp.pp_other1, pp.pp_other2, pp.pp_other3, pp.pp_other4, pp.pp_other5,
        pp.pp_print,
        pp.pp_properties,
        pp.pp_how_to_use,
        pp.pp_caution,
        pp.pp_preservation,
        pp.pp_contraindications,
        pp.pp_use_in_pregnant_women,
        pp.pp_use_in_lactating_women,
        pp.pp_side_effects,
        pp.pp_other_dangerous_reactions,
        pp.pp_suggestion,
        pp.pp_note,
        pp.pp_othereat
      FROM product p
      LEFT JOIN product_pharma pp ON p.pro_code = pp.pp_procode
      WHERE p.pro_code = $1
    `;

    const globalResult = await pool.query(globalQuery, [pro_code]);
    
    if (globalResult.rows.length === 0) {
      return null; // ไม่พบข้อมูลสินค้า
    }

    const baseData = globalResult.rows[0];

    // 2. ถ้าไม่มี mem_id ให้ return ข้อมูล global อย่างเดียว
    if (!mem_id) {
      return {
        ...baseData,
        data_source: 'global',
        has_personal_override: false,
        personal_fields: []
      };
    }

    // 3. ดึงข้อมูล Personal Override (ถ้ามี mem_id)
    const personalQuery = `
      SELECT 
        pp_eatamount,
        pp_daypamount,
        pp_eatunit,
        pp_before_after_meals,
        pp_step1, pp_step2, pp_step3, pp_step4, pp_step5,
        pp_other1, pp_other2, pp_other3, pp_other4, pp_other5,
        pp_properties,
        pp_how_to_use,
        pp_caution,
        pp_preservation,
        pp_contraindications,
        pp_use_in_pregnant_women,
        pp_use_in_lactating_women,
        pp_side_effects,
        pp_other_dangerous_reactions,
        pp_suggestion,
        pp_note,
        pp_othereat
      FROM product_pharma_personal
      WHERE mem_id = $1 AND pp_procode = $2
    `;

    const personalResult = await pool.query(personalQuery, [mem_id, pro_code]);

    // 4. ถ้าไม่มีข้อมูล personal override
    if (personalResult.rows.length === 0) {
      return {
        ...baseData,
        data_source: 'global',
        has_personal_override: false,
        personal_fields: []
      };
    }

    // 5. Merge ข้อมูล Personal Override กับ Global Data
    const personalData = personalResult.rows[0];
    const mergedData = { ...baseData };
    const personalFields = [];

    // Override เฉพาะ field ที่มีค่าใน personal data
    Object.keys(personalData).forEach(key => {
      if (personalData[key] !== null && personalData[key] !== undefined) {
        mergedData[key] = personalData[key];
        personalFields.push(key);
      }
    });

    return {
      ...mergedData,
      data_source: 'mixed', // global + personal
      has_personal_override: true,
      personal_fields: personalFields, // fields ที่ถูก override
      original_global_data: baseData // เก็บข้อมูล global เดิมไว้อ้างอิง
    };

  } catch (error) {
    console.error('Error in getProductWithPharmaInfo:', error);
    throw error;
  }
}

// ฟังก์ชันเสริม: ดึงเฉพาะข้อมูล Global (ไม่ผสม Personal)
static async getGlobalPharmaInfo(pro_code) {
  const query = `
    SELECT 
      pp.*
    FROM product_pharma pp
    WHERE pp.pp_procode = $1
  `;
  
  try {
    const result = await pool.query(query, [pro_code]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

// ฟังก์ชันเสริม: ดึงเฉพาะข้อมูล Personal Override
static async getPersonalPharmaInfo(mem_id, pro_code) {
  const query = `
    SELECT 
      *
    FROM product_pharma_personal
    WHERE mem_id = $1 AND pp_procode = $2
  `;
  
  try {
    const result = await pool.query(query, [mem_id, pro_code]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

// ฟังก์ชันเสริม: ตรวจสอบว่า field ไหนที่แตกต่างระหว่าง global และ personal
static async getPersonalOverrideSummary(mem_id, pro_code) {
  try {
    const globalData = await this.getGlobalPharmaInfo(pro_code);
    const personalData = await this.getPersonalPharmaInfo(mem_id, pro_code);

    if (!personalData) {
      return {
        has_override: false,
        overridden_fields: [],
        changes: []
      };
    }

    const changes = [];
    const overriddenFields = [];

    Object.keys(personalData).forEach(key => {
      if (key.startsWith('pp_') && personalData[key] !== null) {
        overriddenFields.push(key);
        
        const globalValue = globalData ? globalData[key] : null;
        const personalValue = personalData[key];
        
        if (globalValue !== personalValue) {
          changes.push({
            field: key,
            global_value: globalValue,
            personal_value: personalValue
          });
        }
      }
    });

    return {
      has_override: overriddenFields.length > 0,
      overridden_fields: overriddenFields,
      changes: changes
    };

  } catch (error) {
    throw error;
  }
}
  // ดึงสถิติ product_pharma
  static async getProductPharmaStats() {
    const query = `
      SELECT 
        COUNT(*) as total_product_pharma,
        COUNT(CASE WHEN pp_properties IS NOT NULL AND pp_properties != '' THEN 1 END) as with_properties,
        COUNT(CASE WHEN pp_how_to_use IS NOT NULL AND pp_how_to_use != '' THEN 1 END) as with_how_to_use,
        COUNT(CASE WHEN pp_caution IS NOT NULL AND pp_caution != '' THEN 1 END) as with_caution,
        COUNT(CASE WHEN pp_side_effects IS NOT NULL AND pp_side_effects != '' THEN 1 END) as with_side_effects,
        AVG(pp_eatamount) as average_eat_amount,
        AVG(pp_daypamount) as average_day_amount,
        COUNT(CASE WHEN pp_print = 1 THEN 1 END) as printable_count
      FROM product_pharma
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ทดสอบการเชื่อมต่อและดูตาราง product_pharma
  static async testConnection() {
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      console.log('✅ Database connected:', result.rows[0]);
      
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'product_pharma'
        ORDER BY ordinal_position
      `);
      
      if (columns.rows.length > 0) {
        console.log('🏗️ Product_pharma table columns:', columns.rows);
      }
      
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
    }
  }
}

module.exports = ProductPharmaModel;