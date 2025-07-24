// controller/prescription-logsController.js
const PrescriptionLogsModel = require('../model/prescription-logsModel');

class PrescriptionLogsController {
  // POST /api/prescription-logs - สร้าง prescription log ใหม่
  static async createPrescriptionLog(req, res) {
    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      const {
        mem_id,
        product_id,
        product_name_snapshot
      } = req.body;

      // Validation ข้อมูลที่จำเป็น
      if (!mem_id || !product_id || !product_name_snapshot) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน: mem_id, product_id, product_name_snapshot จำเป็นต้องระบุ'
        });
      }

      // // ตรวจสอบ patient_name ไม่เป็นค่าว่าง
      // if (!patient_name.trim()) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'กรุณาระบุชื่อผู้ป่วย'
      //   });
      // }

      // ตรวจสอบว่า member มีอยู่จริง
      const memberExists = await PrescriptionLogsModel.checkMemberExists(mem_id);
      if (!memberExists) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสมาชิก'
        });
      }

      // ตรวจสอบว่า product มีอยู่จริง
      const productExists = await PrescriptionLogsModel.checkProductExists(product_id);
      if (!productExists) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสินค้า'
        });
      }

      // ถ้าไม่มี product snapshot ให้ดึงมาจาก database
      let logData = { ...req.body };
      if (!logData.product_code_snapshot || !logData.product_barcode_snapshot) {
        const productSnapshot = await PrescriptionLogsModel.getProductSnapshot(product_id);
        if (productSnapshot) {
          logData.product_code_snapshot = logData.product_code_snapshot || productSnapshot.product_code;
          logData.product_barcode_snapshot = logData.product_barcode_snapshot || productSnapshot.product_barcode;
        }
      }

      // สร้าง prescription log
      const newLog = await PrescriptionLogsModel.create(logData);

      // ดึงข้อมูลที่เพิ่งสร้างพร้อมรายละเอียด
      const logWithDetails = await PrescriptionLogsModel.findByIdWithDetails(newLog.id);

      res.status(201).json({
        success: true,
        message: 'บันทึกใบสั่งยาสำเร็จ',
        data: logWithDetails,
        id: newLog.id
      });

    } catch (error) {
      console.error('Error creating prescription log:', error);
      
      // Handle specific PostgreSQL errors
      if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({
          success: false,
          message: 'ข้อมูล member_id หรือ product_id ไม่ถูกต้อง'
        });
      }
      
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({
          success: false,
          message: 'ข้อมูลซ้ำ'
        });
      }

      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในระบบ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /api/prescription-logs/:id - ดึงข้อมูล prescription log เดียว
  static async getPrescriptionLogById(req, res) {
    try {
      const { id } = req.params;

      // ตรวจสอบ id เป็นตัวเลข
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID ไม่ถูกต้อง'
        });
      }

      const log = await PrescriptionLogsModel.findByIdWithDetails(id);

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลใบสั่งยา'
        });
      }

      res.json({
        success: true,
        data: log
      });

    } catch (error) {
      console.error('Error fetching prescription log:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในระบบ'
      });
    }
  }

  // GET /api/prescription-logs/member/:mem_id - ดึง prescription logs ของ member
  static async getPrescriptionLogsByMember(req, res) {
    try {
      const { mem_id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // ตรวจสอบ mem_id เป็นตัวเลข
      if (!mem_id || isNaN(mem_id)) {
        return res.status(400).json({
          success: false,
          message: 'Member ID ไม่ถูกต้อง'
        });
      }

      // ตรวจสอบ page และ limit
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'หน้าหรือจำนวนรายการไม่ถูกต้อง (limit สูงสุด 100)'
        });
      }

      // ตรวจสอบว่า member มีอยู่จริง
      const memberExists = await PrescriptionLogsModel.checkMemberExists(mem_id);
      if (!memberExists) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสมาชิก'
        });
      }

      const result = await PrescriptionLogsModel.findByMemberId(mem_id, pageNum, limitNum);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error fetching member prescription logs:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในระบบ'
      });
    }
  }

  // GET /api/prescription-logs/search - ค้นหา prescription logs โดย patient name
  static async searchPrescriptionLogs(req, res) {
    try {
      const { patient_name, page = 1, limit = 10 } = req.query;

      // ตรวจสอบ patient_name
      if (!patient_name || !patient_name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุชื่อผู้ป่วยที่ต้องการค้นหา'
        });
      }

      // ตรวจสอบ page และ limit
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'หน้าหรือจำนวนรายการไม่ถูกต้อง (limit สูงสุด 100)'
        });
      }

      const result = await PrescriptionLogsModel.searchByPatientName(patient_name.trim(), pageNum, limitNum);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        search_term: patient_name.trim()
      });

    } catch (error) {
      console.error('Error searching prescription logs:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในระบบ'
      });
    }
  }

  // PATCH /api/prescription-logs/:id/pdf - อัปเดต PDF file information
  static async updatePDFFile(req, res) {
    try {
      const { id } = req.params;
      const { pdf_file_name, pdf_file_path } = req.body;

      // ตรวจสอบ id เป็นตัวเลข
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID ไม่ถูกต้อง'
        });
      }

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!pdf_file_name) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุชื่อไฟล์ PDF'
        });
      }

      // ตรวจสอบว่า log มีอยู่จริง
      const existingLog = await PrescriptionLogsModel.findByIdWithDetails(id);
      if (!existingLog) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลใบสั่งยา'
        });
      }

      const updatedLog = await PrescriptionLogsModel.updatePDFFile(id, pdf_file_name, pdf_file_path);

      res.json({
        success: true,
        message: 'อัปเดตข้อมูลไฟล์ PDF สำเร็จ',
        data: updatedLog
      });

    } catch (error) {
      console.error('Error updating PDF file:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในระบบ'
      });
    }
  }
}

module.exports = PrescriptionLogsController;