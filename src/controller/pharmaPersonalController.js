// controllers/pharmaPersonalController.js
const PharmaPersonalModel = require('../model/pharmaPersonalModel');

class PharmaPersonalController {
  
  // POST - สร้างหรืออัปเดตข้อมูล pharma personal
  static async createOrUpdate(req, res) {
    try {
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
      } = req.body;

      // Validation - ตรวจสอบข้อมูลที่จำเป็น
      if (!mem_id || !pp_procode) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน: mem_id และ pp_procode จำเป็นต้องมี',
          required_fields: ['mem_id', 'pp_procode']
        });
      }

      // ตรวจสอบประเภทข้อมูล
      if (isNaN(parseInt(mem_id))) {
        return res.status(400).json({
          success: false,
          message: 'mem_id ต้องเป็นตัวเลข'
        });
      }

      if (typeof pp_procode !== 'string' || pp_procode.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'pp_procode ต้องเป็นข้อความที่ไม่ว่าง'
        });
      }

      // จัดเตรียมข้อมูลสำหรับบันทึก
      const pharmaData = {
        mem_id: parseInt(mem_id),
        pp_procode: pp_procode.trim(),
        pp_eatamount: pp_eatamount ? parseInt(pp_eatamount) : null,
        pp_daypamount: pp_daypamount ? parseInt(pp_daypamount) : null,
        pp_preservation: pp_preservation || null,
        pp_contraindications: pp_contraindications || null,
        pp_use_in_pregnant_women: pp_use_in_pregnant_women || null,
        pp_use_in_lactating_women: pp_use_in_lactating_women || null,
        pp_side_effects: pp_side_effects || null,
        pp_other_dangerous_reactions: pp_other_dangerous_reactions || null,
        pp_other5: pp_other5 || null,
        pp_eatunit: pp_eatunit || null,
        pp_note: pp_note || null,
        pp_othereat: pp_othereat || null,
        pp_before_after_meals: pp_before_after_meals || null,
        pp_step1: pp_step1 || null,
        pp_step2: pp_step2 || null,
        pp_step3: pp_step3 || null,
        pp_step4: pp_step4 || null,
        pp_step5: pp_step5 || null,
        pp_suggestion: pp_suggestion || null,
        pp_other1: pp_other1 || null,
        pp_other2: pp_other2 || null,
        pp_other3: pp_other3 || null,
        pp_other4: pp_other4 || null,
        pp_properties: pp_properties || null,
        pp_how_to_use: pp_how_to_use || null,
        pp_caution: pp_caution || null
      };

      // เรียกใช้ Model เพื่อบันทึกข้อมูล
      const result = await PharmaPersonalModel.createOrUpdate(pharmaData);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.action === 'created' 
            ? 'สร้างข้อมูล pharma personal สำเร็จ' 
            : 'อัปเดตข้อมูล pharma personal สำเร็จ',
          action: result.action,
          data: result.data
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
        });
      }

    } catch (error) {
      console.error('Error in createOrUpdate controller:', error);
      
      // จัดการ error ตามประเภท
      if (error.code === '23503') { // Foreign key constraint
        return res.status(400).json({
          success: false,
          message: 'ไม่พบข้อมูลสมาชิก (mem_id ไม่ถูกต้อง)'
        });
      }

      if (error.code === '23505') { // Unique constraint
        return res.status(409).json({
          success: false,
          message: 'ข้อมูลซ้ำกัน'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET - ดึงข้อมูล pharma personal ตาม mem_id และ pp_procode
  static async getByMemberAndProcode(req, res) {
    try {
      const { mem_id, pp_procode } = req.params;

      // Validation
      if (!mem_id || !pp_procode) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน: mem_id และ pp_procode จำเป็นต้องมี'
        });
      }

      if (isNaN(parseInt(mem_id))) {
        return res.status(400).json({
          success: false,
          message: 'mem_id ต้องเป็นตัวเลข'
        });
      }

      // เรียกใช้ Model เพื่อดึงข้อมูล
      const result = await PharmaPersonalModel.getByMemberAndProcode(
        parseInt(mem_id), 
        pp_procode.trim()
      );

      if (result.success) {
        if (result.found) {
          return res.status(200).json({
            success: true,
            message: 'ดึงข้อมูล pharma personal สำเร็จ',
            data: result.data
          });
        } else {
          return res.status(404).json({
            success: false,
            message: 'ไม่พบข้อมูล pharma personal สำหรับสมาชิกและผลิตภัณฑ์นี้',
            data: null
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
      }

    } catch (error) {
      console.error('Error in getByMemberAndProcode controller:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET - ดึงข้อมูล pharma personal ทั้งหมดของ member
  static async getAllByMember(req, res) {
    try {
      const { mem_id } = req.params;

      // Validation
      if (!mem_id) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน: mem_id จำเป็นต้องมี'
        });
      }

      if (isNaN(parseInt(mem_id))) {
        return res.status(400).json({
          success: false,
          message: 'mem_id ต้องเป็นตัวเลข'
        });
      }

      // เรียกใช้ Model เพื่อดึงข้อมูล
      const result = await PharmaPersonalModel.getAllByMember(parseInt(mem_id));

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: `ดึงข้อมูล pharma personal ทั้งหมดสำเร็จ (${result.count} รายการ)`,
          data: result.data,
          count: result.count
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
      }

    } catch (error) {
      console.error('Error in getAllByMember controller:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // PUT - อัปเดตข้อมูลเฉพาะบางฟิลด์
  static async updateFields(req, res) {
    try {
      const { mem_id, pp_procode } = req.params;
      const updateData = req.body;

      // Validation
      if (!mem_id || !pp_procode) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน: mem_id และ pp_procode จำเป็นต้องมี'
        });
      }

      if (isNaN(parseInt(mem_id))) {
        return res.status(400).json({
          success: false,
          message: 'mem_id ต้องเป็นตัวเลข'
        });
      }

      // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
      const existingData = await PharmaPersonalModel.getByMemberAndProcode(
        parseInt(mem_id), 
        pp_procode.trim()
      );

      if (!existingData.found) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูล pharma personal ที่ต้องการอัปเดต'
        });
      }

      // รวมข้อมูลเดิมกับข้อมูลใหม่
      const mergedData = {
        ...existingData.data,
        ...updateData,
        mem_id: parseInt(mem_id),
        pp_procode: pp_procode.trim()
      };

      // เรียกใช้ Model เพื่ออัปเดตข้อมูล
      const result = await PharmaPersonalModel.createOrUpdate(mergedData);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'อัปเดตข้อมูล pharma personal สำเร็จ',
          data: result.data
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
        });
      }

    } catch (error) {
      console.error('Error in updateFields controller:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // DELETE - ลบข้อมูล pharma personal
  static async delete(req, res) {
    try {
      const { mem_id, pp_procode } = req.params;

      // Validation
      if (!mem_id || !pp_procode) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน: mem_id และ pp_procode จำเป็นต้องมี'
        });
      }

      if (isNaN(parseInt(mem_id))) {
        return res.status(400).json({
          success: false,
          message: 'mem_id ต้องเป็นตัวเลข'
        });
      }

      // เรียกใช้ Model เพื่อลบข้อมูล
      const result = await PharmaPersonalModel.delete(
        parseInt(mem_id), 
        pp_procode.trim()
      );

      if (result.success) {
        if (result.deleted) {
          return res.status(200).json({
            success: true,
            message: 'ลบข้อมูล pharma personal สำเร็จ',
            data: result.data
          });
        } else {
          return res.status(404).json({
            success: false,
            message: 'ไม่พบข้อมูล pharma personal ที่ต้องการลบ'
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          message: 'เกิดข้อผิดพลาดในการลบข้อมูล'
        });
      }

    } catch (error) {
      console.error('Error in delete controller:', error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = PharmaPersonalController;