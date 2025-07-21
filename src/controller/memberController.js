const MemberModel = require("../model/memberModel");
const jwt = require('jsonwebtoken');

class MemberController {
  // เพิ่ม member ใหม่ (Register) - Updated
  static async addMember(req, res) {
    try {
      const memberData = req.body;

      // Validation - Updated required fields
      const requiredFields = ["mem_username", "mem_password"];
      const missingFields = requiredFields.filter(
        (field) => !memberData[field]
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
          data: null,
        });
      }

      // Password validation
      if (memberData.mem_password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
          data: null,
        });
      }

      // ตรวจสอบว่า mem_username ซ้ำหรือไม่
      const usernameExists = await MemberModel.checkUsernameExists(memberData.mem_username);
      if (usernameExists) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
          data: null,
        });
      }

      // สร้าง member ใหม่
      const newMember = await MemberModel.createMember(memberData);

      return res.status(201).json({
        success: true,
        message: "Member registered successfully",
        data: newMember,
      });
    } catch (error) {
      console.error("Error in addMember:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงข้อมูล member ทั้งหมด
  static async getAllMembers(req, res) {
    try {
      const members = await MemberModel.getAllMembers();

      return res.status(200).json({
        success: true,
        message: "Members retrieved successfully",
        data: members,
        count: members.length,
      });
    } catch (error) {
      console.error("Error in getAllMembers:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงข้อมูล member ตาม ID
  static async getMemberById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid member ID",
          data: null,
        });
      }

      const member = await MemberModel.getMemberById(id);

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
          data: null,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Member retrieved successfully",
        data: member,
      });
    } catch (error) {
      console.error("Error in getMemberById:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // อัพเดทข้อมูล member - Updated
  static async updateMember(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid member ID",
          data: null,
        });
      }

      const existingMember = await MemberModel.getMemberById(id);
      if (!existingMember) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
          data: null,
        });
      }

      // ตรวจสอบว่ามี data ให update ไหม
      const allowedFields = [
        "mem_username", "mem_nameSite", "mem_license", "mem_type",
        "mem_province", "mem_address", "mem_amphur", "mem_tumbon",
        "mem_post", "mem_taxid", "mem_office", "mem_daystart", 
        "mem_dayend", "mem_timestart", "mem_timeend", "mem_price", 
        "mem_comments", "mem_password"
      ];

      const hasValidFields = Object.keys(updateData).some((field) =>
        allowedFields.includes(field)
      );
      if (!hasValidFields) {
        return res.status(400).json({
          success: false,
          message: "No valid fields to update",
          data: null,
        });
      }

      // ตรวจสอบ mem_username ซ้ำ (ถ้ามีการส่ง mem_username มา)
      if (updateData.mem_username) {
        const usernameExists = await MemberModel.checkUsernameExistsForUpdate(
          updateData.mem_username,
          id
        );
        if (usernameExists) {
          return res.status(409).json({
            success: false,
            message: "Username already exists for another member",
            data: null,
          });
        }
      }

      // Validation เพิ่มเติม
      if (updateData.mem_username !== undefined && !updateData.mem_username.trim()) {
        return res.status(400).json({
          success: false,
          message: "Username cannot be empty",
          data: null,
        });
      }

      // Password validation
      if (updateData.mem_password !== undefined && updateData.mem_password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
          data: null,
        });
      }

      const updatedMember = await MemberModel.updateMember(id, updateData);

      return res.status(200).json({
        success: true,
        message: "Member updated successfully",
        data: updatedMember,
      });

    } catch (error) {
      console.error("Error in updateMember:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // อัพเดทที่อยู่ - Updated
  static async updateAddress(req, res) {
    try {
      const { id } = req.params;
      const { mem_address, mem_village, mem_alley, mem_road, mem_amphur, mem_tumbon, mem_post, mem_province } = req.body;

      // Validation
      if (!mem_address && !mem_village && !mem_alley && !mem_road && !mem_amphur && !mem_tumbon && !mem_post && !mem_province) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกข้อมูลที่อยู่อย่างน้อยหนึ่งช่อง'
        });
      }

      const addressData = {
        mem_address,
        mem_village,
        mem_alley,
        mem_road,
        mem_amphur,
        mem_tumbon,
        mem_post,
        mem_province
      };

      const updatedMember = await MemberModel.updateAddress(id, addressData);
      
      if (!updatedMember) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสมาชิกที่จะอัพเดท'
        });
      }

      res.json({
        success: true,
        message: 'อัพเดทที่อยู่สำเร็จ',
        data: updatedMember
      });
      
    } catch (error) {
      console.error('Update address error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'เกิดข้อผิดพลาดในการอัพเดทที่อยู่'
      });
    }
  }

  // Delete member
  static async deleteMember(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid member ID",
          data: null,
        });
      }

      const existingMember = await MemberModel.getMemberById(id);
      if (!existingMember) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
          data: null,
        });
      }

      const deletedMember = await MemberModel.deleteMember(id);

      return res.status(200).json({
        success: true,
        message: "Member deleted successfully",
        data: deletedMember,
      });
    } catch (error) {
      console.error("Error in deleteMember:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Login member - Updated
  static async loginMember(req, res) {
    try {
      const { username, password, memberCode } = req.body;

      // รองรับทั้ง login ด้วย username และ memberCode
      if ((!username && !memberCode) || !password) {
        return res.status(400).json({
          success: false,
          message: "Username/Member code and password are required",
          data: null,
        });
      }

      let member;
      
      // เลือกวิธี login ตามข้อมูลที่ส่งมา
      if (memberCode) {
        member = await MemberModel.loginMemberByCode(memberCode, password);
      } else {
        member = await MemberModel.loginMember(username, password);
      }

      // สร้าง JWT token ด้วย fields ที่มีอยู่จริงใน table ใหม่
      const token = jwt.sign(
        { 
          mem_id: member.mem_id, 
          mem_code: member.mem_code,
          mem_username: member.mem_username,
          mem_nameSite: member.mem_nameSite,
          mem_type: member.mem_type
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          member: member,
          token: token
        }
      });

    } catch (error) {
      console.error("Error in loginMember:", error);
      
      // Handle specific login errors
      if (error.message === "Member not found" || error.message === "Invalid password") {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
          data: null,
        });
      }

      // Handle table not found error
      if (error.code === '42P01') {
        return res.status(500).json({
          success: false,
          message: "Database table not found. Please contact administrator.",
          data: null,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ทดสอบการเชื่อมต่อ database
  static async testDatabase(req, res) {
    try {
      await MemberModel.testConnection();
      return res.status(200).json({
        success: true,
        message: "Database connection test completed. Check console for details.",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Database connection failed",
        error: error.message,
      });
    }
  }
}

module.exports = MemberController;