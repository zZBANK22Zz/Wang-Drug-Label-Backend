const ProductPharmaModel = require('../model/productPharmaModel');
const ProductModel = require('../model/productModel');

class ProductPharmaController {
  // เพิ่ม product_pharma ใหม่
  static async addProductPharma(req, res) {
    try {
      const productPharmaData = req.body;

      // Validation
      const requiredFields = ['pp_procode'];
      const missingFields = requiredFields.filter(field => !productPharmaData[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          data: null
        });
      }

      // ตรวจสอบว่า product code มีอยู่ใน table product หรือไม่
      const productExists = await ProductModel.getProductByCode(productPharmaData.pp_procode);
      if (!productExists) {
        return res.status(404).json({
          success: false,
          message: 'Product code not found in products table',
          data: null
        });
      }

      // Validate numeric fields
      ['pp_eatamount', 'pp_daypamount', 'pp_print'].forEach(field => {
        if (productPharmaData[field] !== undefined) {
          const value = parseInt(productPharmaData[field]);
          if (isNaN(value) || value < 0) {
            return res.status(400).json({
              success: false,
              message: `${field} must be a valid positive number`,
              data: null
            });
          }
          productPharmaData[field] = value;
        }
      });

      // สร้าง product_pharma ใหม่
      const newProductPharma = await ProductPharmaModel.createProductPharma(productPharmaData);

      return res.status(201).json({
        success: true,
        message: 'Product pharma created successfully',
        data: newProductPharma
      });

    } catch (error) {
      console.error('Error in addProductPharma:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // ดึงข้อมูล product_pharma ทั้งหมด (พร้อม filtering และ pagination)
  static async getAllProductPharma(req, res) {
    try {
      const filters = {
        search: req.query.search,
        pp_procode: req.query.pp_procode,
        sort_by: req.query.sort_by,
        sort_order: req.query.sort_order,
        limit: req.query.limit,
        offset: req.query.offset
      };

      // ลบ undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const productPharmas = await ProductPharmaModel.getAllProductPharma(filters);

      return res.status(200).json({
        success: true,
        message: 'Product pharmas retrieved successfully',
        data: productPharmas,
        count: productPharmas.length,
        filters: filters
      });

    } catch (error) {
      console.error('Error in getAllProductPharma:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // ดึงข้อมูล product_pharma ตาม ID
  static async getProductPharmaById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product pharma ID',
          data: null
        });
      }

      const productPharma = await ProductPharmaModel.getProductPharmaById(id);

      if (!productPharma) {
        return res.status(404).json({
          success: false,
          message: 'Product pharma not found',
          data: null
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product pharma retrieved successfully',
        data: productPharma
      });

    } catch (error) {
      console.error('Error in getProductPharmaById:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // ดึงข้อมูล product_pharma ตาม product code
  static async getProductPharmaByProcode(req, res) {
    try {
      const { procode } = req.params;
      const mem_id = req.user?.mem_id;

      if (!procode) {
        return res.status(400).json({
          success: false,
          message: 'Product code is required',
          data: null
        });
      }

      const productPharma = await ProductPharmaModel.getProductPharmaByProcode(procode, mem_id);

      if (!productPharma) {
        return res.status(404).json({
          success: false,
          message: 'Product pharma not found for this product code',
          data: null
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product pharma retrieved successfully',
        data: productPharma
      });

    } catch (error) {
      console.error('Error in getProductPharmaByProcode:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // ดึงข้อมูล product_pharma หลายรายการตาม product code
  static async getAllProductPharmaByProcode(req, res) {
    try {
      const { procode } = req.params;

      if (!procode) {
        return res.status(400).json({
          success: false,
          message: 'Product code is required',
          data: null
        });
      }

      const productPharmas = await ProductPharmaModel.getAllProductPharmaByProcode(procode);

      return res.status(200).json({
        success: true,
        message: 'Product pharmas retrieved successfully',
        data: productPharmas,
        count: productPharmas.length
      });

    } catch (error) {
      console.error('Error in getAllProductPharmaByProcode:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // ดึงข้อมูล product พร้อมกับ product_pharma
  static async getProductWithPharmaInfo(req, res) {
    try {
      const { procode } = req.params;

      if (!procode) {
        return res.status(400).json({
          success: false,
          message: 'Product code is required',
          data: null
        });
      }

      const productWithPharma = await ProductPharmaModel.getProductWithPharmaInfo(procode);

      if (!productWithPharma) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
          data: null
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product with pharma info retrieved successfully',
        data: productWithPharma
      });

    } catch (error) {
      console.error('Error in getProductWithPharmaInfo:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // อัพเดทข้อมูล product_pharma
  static async updateProductPharma(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product pharma ID',
          data: null
        });
      }

      // ตรวจสอบว่า product_pharma มีอยู่จริง
      const existingProductPharma = await ProductPharmaModel.getProductPharmaById(id);
      if (!existingProductPharma) {
        return res.status(404).json({
          success: false,
          message: 'Product pharma not found',
          data: null
        });
      }

      // ตรวจสอบว่ามีข้อมูลให้ update หรือไม่
      const allowedFields = [
        'pp_procode', 'pp_eatamount', 'pp_daypamount', 'pp_eatunit', 'pp_before_after_meals',
        'pp_step1', 'pp_step2', 'pp_step3', 'pp_step4', 'pp_step5',
        'pp_other1', 'pp_other2', 'pp_other3', 'pp_other4', 'pp_other5',
        'pp_print', 'pp_properties', 'pp_how_to_use', 'pp_caution', 'pp_preservation',
        'pp_contraindications', 'pp_use_in_pregnant_women', 'pp_use_in_lactating_women',
        'pp_side_effects', 'pp_other_dangerous_reactions', 'pp_suggestion', 'pp_note', 'pp_othereat'
      ];

      const hasValidFields = Object.keys(updateData).some(key => allowedFields.includes(key));

      if (!hasValidFields) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update',
          data: null
        });
      }

      // ตรวจสอบ product code ใหม่ (ถ้ามีการส่ง pp_procode มา)
      if (updateData.pp_procode) {
        const productExists = await ProductModel.getProductByCode(updateData.pp_procode);
        if (!productExists) {
          return res.status(404).json({
            success: false,
            message: 'Product code not found in products table',
            data: null
          });
        }
      }

      // Validation เพิ่มเติม
      if (updateData.pp_procode !== undefined && !updateData.pp_procode.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Product code cannot be empty',
          data: null
        });
      }

      // Validate numeric fields
      ['pp_eatamount', 'pp_daypamount', 'pp_print'].forEach(field => {
        if (updateData[field] !== undefined) {
          const value = parseInt(updateData[field]);
          if (isNaN(value) || value < 0) {
            return res.status(400).json({
              success: false,
              message: `${field} must be a valid positive number`,
              data: null
            });
          }
          updateData[field] = value;
        }
      });

      // อัพเดทข้อมูล
      const updatedProductPharma = await ProductPharmaModel.updateProductPharma(id, updateData);

      return res.status(200).json({
        success: true,
        message: 'Product pharma updated successfully',
        data: updatedProductPharma
      });

    } catch (error) {
      console.error('Error in updateProductPharma:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // ลบ product_pharma
  static async deleteProductPharma(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product pharma ID',
          data: null
        });
      }

      // ตรวจสอบว่า product_pharma มีอยู่จริง
      const existingProductPharma = await ProductPharmaModel.getProductPharmaById(id);
      if (!existingProductPharma) {
        return res.status(404).json({
          success: false,
          message: 'Product pharma not found',
          data: null
        });
      }

      const deletedProductPharma = await ProductPharmaModel.deleteProductPharma(id);

      return res.status(200).json({
        success: true,
        message: 'Product pharma deleted successfully',
        data: deletedProductPharma
      });

    } catch (error) {
      console.error('Error in deleteProductPharma:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // ลบ product_pharma ตาม product code
  static async deleteProductPharmaByProcode(req, res) {
    try {
      const { procode } = req.params;

      if (!procode) {
        return res.status(400).json({
          success: false,
          message: 'Product code is required',
          data: null
        });
      }

      // ตรวจสอบว่ามี product_pharma สำหรับ procode นี้หรือไม่
      const exists = await ProductPharmaModel.checkProductPharmaExists(procode);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'Product pharma not found for this product code',
          data: null
        });
      }

      const deletedProductPharmas = await ProductPharmaModel.deleteProductPharmaByProcode(procode);

      return res.status(200).json({
        success: true,
        message: 'Product pharma records deleted successfully',
        data: deletedProductPharmas,
        count: deletedProductPharmas.length
      });

    } catch (error) {
      console.error('Error in deleteProductPharmaByProcode:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // ดึงสถิติ product_pharma
  static async getProductPharmaStats(req, res) {
    try {
      const stats = await ProductPharmaModel.getProductPharmaStats();

      // Convert to numbers for easier use
      const formattedStats = {
        total_product_pharma: parseInt(stats.total_product_pharma),
        with_properties: parseInt(stats.with_properties),
        with_how_to_use: parseInt(stats.with_how_to_use),
        with_caution: parseInt(stats.with_caution),
        with_side_effects: parseInt(stats.with_side_effects),
        average_eat_amount: parseFloat(stats.average_eat_amount) || 0,
        average_day_amount: parseFloat(stats.average_day_amount) || 0,
        printable_count: parseInt(stats.printable_count) || 0
      };

      return res.status(200).json({
        success: true,
        message: 'Product pharma statistics retrieved successfully',
        data: formattedStats
      });

    } catch (error) {
      console.error('Error in getProductPharmaStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // ทดสอบการเชื่อมต่อ database สำหรับ product_pharma
  static async testDatabase(req, res) {
    try {
      await ProductPharmaModel.testConnection();
      return res.status(200).json({
        success: true,
        message: "Product pharma database connection test completed. Check console for details.",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Product pharma database connection failed",
        error: error.message,
      });
    }
  }
}

module.exports = ProductPharmaController;