const MemberModel = require("../model/memberModel");

class MemberController {
  // เพิ่ม member ใหม่
  static async addMember(req, res) {
    try {
      const memberData = req.body;

      // Validation
      const requiredFields = ["mem_code", "mem_name", "province", "emp_code"];
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

      return res.status(201).json({
        success: true,
        message: "Member created successfully",
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

      return res.status(200).json({
        success: true,
        message: "Picking status updated successfully",
        data: updatedMember,
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
      // ตรวจสอบว่า member ที่จะอัพเดทมีอยู่จริงหรือไม่
      const exitingMember = await MemberModel.getAllMembers(id);
      if (!exitingMember) {
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

      const updatedMember = await MemberModel.updateMemberById(id, updateData);

      return res.status(200).json({
        sucess: true,
        message: "Member updated successfully",
        data: updatedMember,
      });

    } catch (e) {
      console.error("Error in updateMember:", e);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: e.message,
      });
    }
  }

  // deletemember
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

      const deletedMember = await MemberModel.deleteMemberById(id);

      if (!deletedMember) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
          data: null,
        });
      }

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
}

module.exports = MemberController;
