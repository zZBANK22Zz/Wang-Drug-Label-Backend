const MemberModel = require("../model/memberModel");
const jwt = require('jsonwebtoken');

class MemberController {
  // เพิ่ม member ใหม่ (Register)
  static async addMember(req, res) {
    try {
      const memberData = req.body;

      // Validation - เพิ่ม password
      const requiredFields = ["mem_code", "mem_name", "province", "password"];
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
      if (memberData.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
          data: null,
        });
      }

      // ตรวจสอบว่า mem_code ซ้ำหรือไม่
      const codeExists = await MemberModel.checkMemberCodeExists(
        memberData.mem_code
      );
      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: "Member code already exists",
          data: null,
        });
      }

      // สร้าง member ใหม่
      const newMember = await MemberModel.createMember(memberData);

      // ลบ password ก่อน return
      const { password, ...memberWithoutPassword } = newMember;

      return res.status(201).json({
        success: true,
        message: "Member registered successfully",
        data: memberWithoutPassword,
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

      // ลบ password ก่อน return
      const { password, ...memberWithoutPassword } = member;

      return res.status(200).json({
        success: true,
        message: "Member retrieved successfully",
        data: memberWithoutPassword,
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

  // อัพเดท picking status
  static async updatePickingStatus(req, res) {
    try {
      const { id } = req.params;
      const { picking_status, emp_code_picking } = req.body;

      // Validation
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid member ID",
          data: null,
        });
      }

      if (!picking_status) {
        return res.status(400).json({
          success: false,
          message: "Picking status is required",
          data: null,
        });
      }

      // เปลี่ยนเป็น 2 status เท่านั้น: pending, picking
      const validStatuses = ["pending", "picking"];
      if (!validStatuses.includes(picking_status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid picking status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
          data: null,
        });
      }

      const updatedMember = await MemberModel.updatePickingStatus(
        id,
        picking_status,
        emp_code_picking
      );

      if (!updatedMember) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
          data: null,
        });
      }

      // ลบ password ก่อน return
      const { password, ...memberWithoutPassword } = updatedMember;

      return res.status(200).json({
        success: true,
        message: "Picking status updated successfully",
        data: memberWithoutPassword,
      });
    } catch (error) {
      console.error("Error in updatePickingStatus:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // อัพเดทข้อมูล member
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

      // แก้ไข: ใช้ getMemberById แทน getAllMembers
      const existingMember = await MemberModel.getMemberById(id);
      if (!existingMember) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
          data: null,
        });
      }

      //ตรวจสอบว่ามี data ให update ไหม
      const allowedFields = [
        "mem_code",
        "mem_name",
        "province",
        "emp_code",
        "mem_note",
        "password"
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

      // ตรวจสอบ mem_code ซ้ำ (ถ้ามีการส่ง mem_code มา)
      if (updateData.mem_code) {
        const codeExists = await MemberModel.checkMemberCodeExistsForUpdate(
          updateData.mem_code,
          id
        );
        if (codeExists) {
          return res.status(409).json({
            success: false,
            message: "Member code already exists for another member",
            data: null,
          });
        }
      }

      // Validation เพิ่มเติมสำหรับ required fields ถ้ามีการส่งมา
      if (updateData.mem_code !== undefined && !updateData.mem_code.trim()) {
        return res.status(400).json({
          success: false,
          message: "Member code cannot be empty",
          data: null,
        });
      }

      if (updateData.mem_name !== undefined && !updateData.mem_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Member name cannot be empty",
          data: null,
        });
      }

      if (updateData.province !== undefined && !updateData.province.trim()) {
        return res.status(400).json({
          success: false,
          message: "Province cannot be empty",
          data: null,
        });
      }

      if (updateData.emp_code !== undefined && !updateData.emp_code.trim()) {
        return res.status(400).json({
          success: false,
          message: "Employee code cannot be empty",
          data: null,
        });
      }

      // Password validation
      if (updateData.password !== undefined && updateData.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
          data: null,
        });
      }

      // แก้ไข: ใช้ updateMember แทน updateMemberById
      const updatedMember = await MemberModel.updateMember(id, updateData);

      // ลบ password ก่อน return
      const { password, ...memberWithoutPassword } = updatedMember;

      return res.status(200).json({
        success: true, // แก้ไข typo
        message: "Member updated successfully",
        data: memberWithoutPassword,
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

      // ตรวจสอบว่า member มีอยู่จริง
      const existingMember = await MemberModel.getMemberById(id);
      if (!existingMember) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
          data: null,
        });
      }

      // แก้ไข: ใช้ deleteMember แทน deleteMemberById
      const deletedMember = await MemberModel.deleteMember(id);

      // ลบ password ก่อน return
      const { password, ...memberWithoutPassword } = deletedMember;

      return res.status(200).json({
        success: true,
        message: "Member deleted successfully",
        data: memberWithoutPassword,
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

  /*=============================================
                      Login member
  =============================================*/
  static async loginMember(req, res) {
    try {
      const { mem_code, password } = req.body;

      if (!mem_code || !password) {
        return res.status(400).json({
          success: false,
          message: "Member code and password are required",
          data: null,
        });
      }

      // ตรวจสอบ login
      const member = await MemberModel.loginMember(mem_code, password);

      // สร้าง JWT token
      const token = jwt.sign(
        { 
          mem_id: member.mem_id, 
          mem_code: member.mem_code,
          mem_name: member.mem_name 
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
          message: "Invalid member code or password",
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
}

module.exports = MemberController;