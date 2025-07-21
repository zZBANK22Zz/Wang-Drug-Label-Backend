// model/prescription-logsModel.js
const pool = require('../config/database'); // สมมุติว่ามี database config อยู่ใน config folder

class PrescriptionLogsModel {
  // สร้าง prescription log ใหม่
  static async create(logData) {
    const client = await pool.connect();
    
    try {
      const insertQuery = `
        INSERT INTO prescription_logs (
          mem_id,
          product_id,
          patient_name,
          product_name_snapshot,
          product_code_snapshot,
          product_barcode_snapshot,
          properties,
          indications,
          dosage_per_time,
          quantity_tablets,
          dosage_per_day,
          dosage_every_hours,
          meal_before_30min,
          meal_after_immediately,
          meal_after_15min,
          meal_empty_stomach,
          time_morning,
          time_noon,
          time_evening,
          time_before_bed,
          additional_advice,
          precautions,
          contraindications,
          pregnancy_use,
          breastfeeding_use,
          side_effects,
          drug_interactions,
          storage,
          pdf_file_path,
          pdf_file_name,
          prescription_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
        )
        RETURNING id, created_at
      `;

      const values = [
        logData.mem_id,
        logData.product_id,
        logData.patient_name,
        logData.product_name_snapshot,
        logData.product_code_snapshot || null,
        logData.product_barcode_snapshot || null,
        logData.properties || null,
        logData.indications || null,
        logData.dosage_per_time || null,
        logData.quantity_tablets || '10',
        logData.dosage_per_day || null,
        logData.dosage_every_hours || null,
        logData.meal_before_30min || false,
        logData.meal_after_immediately || false,
        logData.meal_after_15min || false,
        logData.meal_empty_stomach || false,
        logData.time_morning || false,
        logData.time_noon || false,
        logData.time_evening || false,
        logData.time_before_bed || false,
        logData.additional_advice || null,
        logData.precautions || null,
        logData.contraindications || null,
        logData.pregnancy_use || null,
        logData.breastfeeding_use || null,
        logData.side_effects || null,
        logData.drug_interactions || null,
        logData.storage || null,
        logData.pdf_file_path || null,
        logData.pdf_file_name || null,
        logData.prescription_date || new Date().toISOString().split('T')[0]
      ];

      const result = await client.query(insertQuery, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ดึงข้อมูล prescription log พร้อม join ข้อมูล member และ product
  static async findByIdWithDetails(id) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          pl.*,
          m.mem_name,
          m.mem_code,
          p.product_name as current_product_name,
          p.product_code as current_product_code
        FROM prescription_logs pl
        JOIN members m ON pl.mem_id = m.mem_id
        LEFT JOIN products p ON pl.product_id = p.product_id
        WHERE pl.id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // ดึง prescription logs ของ member
  static async findByMemberId(memId, page = 1, limit = 10) {
    const client = await pool.connect();
    
    try {
      const offset = (page - 1) * limit;

      const query = `
        SELECT 
          pl.*,
          m.mem_name,
          m.mem_code,
          p.product_name as current_product_name,
          p.product_code as current_product_code
        FROM prescription_logs pl
        JOIN members m ON pl.mem_id = m.mem_id
        LEFT JOIN products p ON pl.product_id = p.product_id
        WHERE pl.mem_id = $1
        ORDER BY pl.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM prescription_logs
        WHERE mem_id = $1
      `;

      const [result, countResult] = await Promise.all([
        client.query(query, [memId, limit, offset]),
        client.query(countQuery, [memId])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_records: total,
          records_per_page: parseInt(limit)
        }
      };
    } finally {
      client.release();
    }
  }

  // ตรวจสอบว่า member มีอยู่หรือไม่
  static async checkMemberExists(memId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT mem_id FROM members WHERE mem_id = $1',
        [memId]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  // ตรวจสอบว่า product มีอยู่หรือไม่
  static async checkProductExists(productId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT product_id FROM products WHERE product_id = $1',
        [productId]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  // ดึงข้อมูล product สำหรับ snapshot
  static async getProductSnapshot(productId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT product_name, product_code, product_barcode FROM products WHERE product_id = $1',
        [productId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // ค้นหา logs โดย patient name
  static async searchByPatientName(patientName, page = 1, limit = 10) {
    const client = await pool.connect();
    
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${patientName}%`;

      const query = `
        SELECT 
          pl.*,
          m.mem_name,
          m.mem_code,
          p.product_name as current_product_name,
          p.product_code as current_product_code
        FROM prescription_logs pl
        JOIN members m ON pl.mem_id = m.mem_id
        LEFT JOIN products p ON pl.product_id = p.product_id
        WHERE pl.patient_name ILIKE $1
        ORDER BY pl.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM prescription_logs
        WHERE patient_name ILIKE $1
      `;

      const [result, countResult] = await Promise.all([
        client.query(query, [searchPattern, limit, offset]),
        client.query(countQuery, [searchPattern])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        data: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_records: total,
          records_per_page: parseInt(limit)
        }
      };
    } finally {
      client.release();
    }
  }

  // อัปเดต PDF file path
  static async updatePDFFile(id, pdfFileName, pdfFilePath) {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE prescription_logs 
        SET pdf_file_name = $1, pdf_file_path = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, pdf_file_name, pdf_file_path
      `;

      const result = await client.query(query, [pdfFileName, pdfFilePath, id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}

module.exports = PrescriptionLogsModel;