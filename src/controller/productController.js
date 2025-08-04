const ProductModel = require("../model/productModel");
const pool = require("../config/database");

class ProductController {
  // เพิ่ม product ใหม่
  static async addProduct(req, res) {
    try {
      const productData = req.body;

      // Validation
      const requiredFields = ["pro_code", "pro_name"];
      const missingFields = requiredFields.filter(
        (field) => !productData[field]
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
          data: null,
        });
      }

      // ตรวจสอบว่า pro_code ซ้ำหรือไม่
      const codeExists = await ProductModel.checkProductCodeExists(
        productData.pro_code
      );
      if (codeExists) {
        return res.status(409).json({
          success: false,
          message: "Product code already exists",
          data: null,
        });
      }

      // Validate stock (ต้องเป็นตัวเลข)
      if (productData.pro_instock !== undefined) {
        const stock = parseFloat(productData.pro_instock);
        if (isNaN(stock) || stock < 0) {
          return res.status(400).json({
            success: false,
            message: "Product stock must be a valid positive number",
            data: null,
          });
        }
        productData.pro_instock = stock;
      }

      // Validate prices
      ["pro_price1", "pro_price2", "pro_price3", "pro_pricethai"].forEach(
        (priceField) => {
          if (productData[priceField] !== undefined) {
            const price = parseFloat(productData[priceField]);
            if (isNaN(price) || price < 0) {
              return res.status(400).json({
                success: false,
                message: `${priceField} must be a valid positive number`,
                data: null,
              });
            }
            productData[priceField] = price;
          }
        }
      );

      // Validate ratios
      ["pro_ratio1", "pro_ratio2", "pro_ratio3"].forEach((ratioField) => {
        if (productData[ratioField] !== undefined) {
          const ratio = parseInt(productData[ratioField]);
          if (isNaN(ratio) || ratio < 0) {
            return res.status(400).json({
              success: false,
              message: `${ratioField} must be a valid positive integer`,
              data: null,
            });
          }
          productData[ratioField] = ratio;
        }
      });

      // Validate GLWA fields (0 or 1)
      for (let i = 1; i <= 10; i++) {
        const glwaField = `pro_glwa${i}`;
        if (productData[glwaField] !== undefined) {
          if (!["0", "1"].includes(productData[glwaField])) {
            return res.status(400).json({
              success: false,
              message: `${glwaField} must be '0' or '1'`,
              data: null,
            });
          }
        }
      }

      // Validate PS fields (0 or 1)
      for (let i = 1; i <= 8; i++) {
        const psField = `pro_ps${i}`;
        if (productData[psField] !== undefined) {
          if (!["0", "1"].includes(productData[psField])) {
            return res.status(400).json({
              success: false,
              message: `${psField} must be '0' or '1'`,
              data: null,
            });
          }
        }
      }

      // สร้าง product ใหม่
      const newProduct = await ProductModel.createProduct(productData);

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: newProduct,
      });
    } catch (error) {
      console.error("Error in addProduct:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงข้อมูล products ทั้งหมด (พร้อม filtering และ pagination)
  static async getAllProducts(req, res) {
    try {
      const filters = {
        search: req.query.search,
        drug_type: req.query.drug_type,
        stock_status: req.query.stock_status,
        min_price: req.query.min_price,
        max_price: req.query.max_price,
        min_rating: req.query.min_rating,
        sort_by: req.query.sort_by,
        sort_order: req.query.sort_order,
        limit: req.query.limit,
        offset: req.query.offset,
      };

      // ลบ undefined values
      Object.keys(filters).forEach((key) => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const products = await ProductModel.getAllProducts(filters);

      return res.status(200).json({
        success: true,
        message: "Products retrieved successfully",
        data: products,
        count: products.length,
        filters: filters,
      });
    } catch (error) {
      console.error("Error in getAllProducts:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงข้อมูล product ตาม ID
  static async getProductById(req, res) {
    try {
      const { id } = req.params;
      const { increment_view } = req.query;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
          data: null,
        });
      }

      let product = await ProductModel.getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
          data: null,
        });
      }

      // เพิ่ม view count ถ้าระบุ
      if (increment_view === "true") {
        product = await ProductModel.updateRatingAndView(id, null, true);
      }

      return res.status(200).json({
        success: true,
        message: "Product retrieved successfully",
        data: product,
      });
    } catch (error) {
      console.error("Error in getProductById:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงข้อมูล product ตาม code
  static async getProductByCode(req, res) {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Product code is required",
          data: null,
        });
      }

      const product = await ProductModel.getProductByCode(code);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
          data: null,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Product retrieved successfully",
        data: product,
      });
    } catch (error) {
      console.error("Error in getProductByCode:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงข้อมูล product ตาม barcode (รองรับ 3 barcode)
  static async getProductByBarcode(req, res) {
    try {
      const { barcode } = req.params;

      if (!barcode) {
        return res.status(400).json({
          success: false,
          message: "Barcode is required",
          data: null,
        });
      }

      const product = await ProductModel.getProductByBarcode(barcode);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product with this barcode not found",
          data: null,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Product found by barcode",
        data: product,
      });
    } catch (error) {
      console.error("Error in getProductByBarcode:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // อัพเดทข้อมูล product
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
          data: null,
        });
      }

      // ตรวจสอบว่า product มีอยู่จริง
      const existingProduct = await ProductModel.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
          data: null,
        });
      }

      // ตรวจสอบว่ามีข้อมูลให้ update หรือไม่
      const allowedFields = [
        "pro_code",
        "pro_name",
        "pro_proname",
        "pro_nameeng",
        "pro_nameth",
        "pro_genericname",
        "pro_drugmain",
        "pro_keysearch",
        "pro_unit1",
        "pro_ratio1",
        "pro_unit2",
        "pro_ratio2",
        "pro_unit3",
        "pro_ratio3",
        "pro_supplies",
        "pro_barcode1",
        "pro_barcode2",
        "pro_barcode3",
        "pro_price1",
        "pro_price2",
        "pro_price3",
        "pro_limitcontrol",
        "pro_pricethai",
        "pro_instock",
        "pro_imgmain",
        "pro_img",
        "pro_imgu1",
        "pro_imgu2",
        "pro_imgu3",
        "pro_glwa1",
        "pro_glwa2",
        "pro_glwa3",
        "pro_glwa4",
        "pro_glwa5",
        "pro_glwa6",
        "pro_glwa7",
        "pro_glwa8",
        "pro_glwa9",
        "pro_glwa10",
        "pro_drugregister",
        "pro_ps1",
        "pro_ps2",
        "pro_ps3",
        "pro_ps4",
        "pro_ps5",
        "pro_ps6",
        "pro_ps7",
        "pro_ps8",
        "pro_point",
        "pro_view",
        "pro_rating",
      ];

      const hasValidFields = Object.keys(updateData).some((key) =>
        allowedFields.includes(key)
      );

      if (!hasValidFields) {
        return res.status(400).json({
          success: false,
          message: "No valid fields to update",
          data: null,
        });
      }

      // ตรวจสอบ pro_code ซ้ำ (ถ้ามีการส่ง pro_code มา)
      if (updateData.pro_code) {
        const codeExists = await ProductModel.checkProductCodeExistsForUpdate(
          updateData.pro_code,
          id
        );
        if (codeExists) {
          return res.status(409).json({
            success: false,
            message: "Product code already exists for another product",
            data: null,
          });
        }
      }

      // Validation เพิ่มเติม
      if (updateData.pro_code !== undefined && !updateData.pro_code.trim()) {
        return res.status(400).json({
          success: false,
          message: "Product code cannot be empty",
          data: null,
        });
      }

      if (updateData.pro_name !== undefined && !updateData.pro_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Product name cannot be empty",
          data: null,
        });
      }

      // Validate stock
      if (updateData.pro_instock !== undefined) {
        const stock = parseFloat(updateData.pro_instock);
        if (isNaN(stock) || stock < 0) {
          return res.status(400).json({
            success: false,
            message: "Product stock must be a valid positive number",
            data: null,
          });
        }
        updateData.pro_instock = stock;
      }

      // Validate prices
      ["pro_price1", "pro_price2", "pro_price3", "pro_pricethai"].forEach(
        (priceField) => {
          if (updateData[priceField] !== undefined) {
            const price = parseFloat(updateData[priceField]);
            if (isNaN(price) || price < 0) {
              return res.status(400).json({
                success: false,
                message: `${priceField} must be a valid positive number`,
                data: null,
              });
            }
            updateData[priceField] = price;
          }
        }
      );

      // อัพเดทข้อมูล
      const updatedProduct = await ProductModel.updateProduct(id, updateData);

      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Error in updateProduct:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  //update product with pharma รองรับการ update ข้อมูลจากของพี่โต้ และ ภายใน services
  // อัพเดท product พร้อมกับ product_pharma ในครั้งเดียว
  static async updateProductWithPharma(req, res) {
    const client = await pool.connect(); // Get client for transaction

    try {
      await client.query("BEGIN"); // Start transaction

      const { id } = req.params;
      const { product, pharma } = req.body;

      // Validation product ID
      if (!id || isNaN(id)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
          data: null,
        });
      }

      // ตรวจสอบว่า product มีอยู่จริง
      const existingProduct = await ProductModel.getProductById(id);
      if (!existingProduct) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Product not found",
          data: null,
        });
      }

      let updatedProduct = existingProduct;
      let updatedProductPharma = null;

      // อัปเดต Product (ถ้ามีข้อมูล product ส่งมา)
      if (product && Object.keys(product).length > 0) {
        // ตรวจสอบว่ามีข้อมูลให้ update หรือไม่
        const allowedProductFields = [
          "pro_code",
          "pro_name",
          "pro_proname",
          "pro_nameeng",
          "pro_nameth",
          "pro_genericname",
          "pro_drugmain",
          "pro_keysearch",
          "pro_unit1",
          "pro_ratio1",
          "pro_unit2",
          "pro_ratio2",
          "pro_unit3",
          "pro_ratio3",
          "pro_supplies",
          "pro_barcode1",
          "pro_barcode2",
          "pro_barcode3",
          "pro_price1",
          "pro_price2",
          "pro_price3",
          "pro_limitcontrol",
          "pro_pricethai",
          "pro_instock",
          "pro_imgmain",
          "pro_img",
          "pro_imgu1",
          "pro_imgu2",
          "pro_imgu3",
          "pro_glwa1",
          "pro_glwa2",
          "pro_glwa3",
          "pro_glwa4",
          "pro_glwa5",
          "pro_glwa6",
          "pro_glwa7",
          "pro_glwa8",
          "pro_glwa9",
          "pro_glwa10",
          "pro_drugregister",
          "pro_ps1",
          "pro_ps2",
          "pro_ps3",
          "pro_ps4",
          "pro_ps5",
          "pro_ps6",
          "pro_ps7",
          "pro_ps8",
          "pro_point",
          "pro_view",
          "pro_rating",
        ];

        const hasValidProductFields = Object.keys(product).some((key) =>
          allowedProductFields.includes(key)
        );

        if (!hasValidProductFields) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: "No valid product fields to update",
            data: null,
          });
        }

        // ตรวจสอบ pro_code ซ้ำ (ถ้ามีการส่ง pro_code มา)
        if (product.pro_code) {
          const codeExists = await ProductModel.checkProductCodeExistsForUpdate(
            product.pro_code,
            id
          );
          if (codeExists) {
            await client.query("ROLLBACK");
            return res.status(409).json({
              success: false,
              message: "Product code already exists for another product",
              data: null,
            });
          }
        }

        // Validation เพิ่มเติม
        if (product.pro_code !== undefined && !product.pro_code.trim()) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: "Product code cannot be empty",
            data: null,
          });
        }

        if (product.pro_name !== undefined && !product.pro_name.trim()) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: "Product name cannot be empty",
            data: null,
          });
        }

        // Validate stock
        if (product.pro_instock !== undefined) {
          const stock = parseFloat(product.pro_instock);
          if (isNaN(stock) || stock < 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              success: false,
              message: "Product stock must be a valid positive number",
              data: null,
            });
          }
          product.pro_instock = stock;
        }

        // Validate prices
        for (const priceField of [
          "pro_price1",
          "pro_price2",
          "pro_price3",
          "pro_pricethai",
        ]) {
          if (product[priceField] !== undefined) {
            const price = parseFloat(product[priceField]);
            if (isNaN(price) || price < 0) {
              await client.query("ROLLBACK");
              return res.status(400).json({
                success: false,
                message: `${priceField} must be a valid positive number`,
                data: null,
              });
            }
            product[priceField] = price;
          }
        }

        // Validate ratios
        for (const ratioField of ["pro_ratio1", "pro_ratio2", "pro_ratio3"]) {
          if (product[ratioField] !== undefined) {
            const ratio = parseInt(product[ratioField]);
            if (isNaN(ratio) || ratio < 0) {
              await client.query("ROLLBACK");
              return res.status(400).json({
                success: false,
                message: `${ratioField} must be a valid positive integer`,
                data: null,
              });
            }
            product[ratioField] = ratio;
          }
        }

        // Validate GLWA fields (0 or 1)
        for (let i = 1; i <= 10; i++) {
          const glwaField = `pro_glwa${i}`;
          if (product[glwaField] !== undefined) {
            if (!["0", "1"].includes(product[glwaField])) {
              await client.query("ROLLBACK");
              return res.status(400).json({
                success: false,
                message: `${glwaField} must be '0' or '1'`,
                data: null,
              });
            }
          }
        }

        // Validate PS fields (0 or 1)
        for (let i = 1; i <= 8; i++) {
          const psField = `pro_ps${i}`;
          if (product[psField] !== undefined) {
            if (!["0", "1"].includes(product[psField])) {
              await client.query("ROLLBACK");
              return res.status(400).json({
                success: false,
                message: `${psField} must be '0' or '1'`,
                data: null,
              });
            }
          }
        }

        // อัปเดต product (ใช้ transaction client)
        updatedProduct = await ProductModel.updateProduct(id, product, client);
        console.log("✅ Product updated:", updatedProduct.pro_code);
      }

      // อัปเดต Product Pharma (ถ้ามีข้อมูล pharma ส่งมา)
      if (pharma && Object.keys(pharma).length > 0) {
        // ตรวจสอบว่ามีข้อมูลให้ update หรือไม่
        const allowedPharmaFields = [
          "pp_procode",
          "pp_eatamount",
          "pp_daypamount",
          "pp_eatunit",
          "pp_before_after_meals",
          "pp_step1",
          "pp_step2",
          "pp_step3",
          "pp_step4",
          "pp_step5",
          "pp_other1",
          "pp_other2",
          "pp_other3",
          "pp_other4",
          "pp_other5",
          "pp_print",
          "pp_properties",
          "pp_how_to_use",
          "pp_caution",
          "pp_preservation",
          "pp_contraindications",
          "pp_use_in_pregnant_women",
          "pp_use_in_lactating_women",
          "pp_side_effects",
          "pp_other_dangerous_reactions",
          "pp_suggestion",
          "pp_note",
          "pp_othereat",
        ];

        const hasValidPharmaFields = Object.keys(pharma).some((key) =>
          allowedPharmaFields.includes(key)
        );

        if (hasValidPharmaFields) {
          // ถ้ามีการส่ง pp_procode มา ให้ตรวจสอบว่า product code มีอยู่หรือไม่
          if (pharma.pp_procode) {
            const productExists = await ProductModel.getProductByCode(
              pharma.pp_procode
            );
            if (!productExists) {
              await client.query("ROLLBACK");
              return res.status(404).json({
                success: false,
                message: "Product code not found in products table",
                data: null,
              });
            }
          } else {
            // ถ้าไม่ได้ส่ง pp_procode มา ให้ใช้ pro_code ของ product ที่อัปเดต
            pharma.pp_procode = updatedProduct.pro_code;
          }

          // Validation เพิ่มเติม
          if (pharma.pp_procode !== undefined && !pharma.pp_procode.trim()) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              success: false,
              message: "Product code cannot be empty",
              data: null,
            });
          }

          // Validate numeric fields
          for (const field of ["pp_eatamount", "pp_daypamount", "pp_print"]) {
            if (pharma[field] !== undefined) {
              const value = parseInt(pharma[field]);
              if (isNaN(value) || value < 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                  success: false,
                  message: `${field} must be a valid positive number`,
                  data: null,
                });
              }
              pharma[field] = value;
            }
          }

          // ตรวจสอบว่ามี product_pharma สำหรับ product นี้หรือไม่
          const ProductPharmaModel = require("../model/productPharmaModel");
          const existingPharma =
            await ProductPharmaModel.getProductPharmaByProcode(
              updatedProduct.pro_code
            );

          if (existingPharma) {
            // ถ้ามีอยู่แล้ว ให้อัปเดต
            updatedProductPharma = await ProductPharmaModel.updateProductPharma(
              existingPharma.pp_id,
              pharma,
              client
            );
            console.log(
              "✅ Product pharma updated for:",
              updatedProduct.pro_code
            );
          } else {
            // ถ้าไม่มี ให้สร้างใหม่
            updatedProductPharma = await ProductPharmaModel.createProductPharma(
              pharma,
              client
            );
            console.log(
              "✅ Product pharma created for:",
              updatedProduct.pro_code
            );
          }
        }
      }

      await client.query("COMMIT"); // Commit transaction

      return res.status(200).json({
        success: true,
        message: "Product and product pharma updated successfully",
        data: {
          product: updatedProduct,
          pharma: updatedProductPharma,
          updated_pharma: !!updatedProductPharma,
          pharma_action: updatedProductPharma
            ? pharma && Object.keys(pharma).length > 0
              ? "updated"
              : "no_changes"
            : "no_pharma_data",
        },
      });
    } catch (error) {
      await client.query("ROLLBACK"); // Rollback on error
      console.error("Error in updateProductWithPharma:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    } finally {
      client.release(); // Release client back to pool
    }
  }

  // อัพเดท stock สินค้า
  static async updateStock(req, res) {
    try {
      const { id } = req.params;
      const { stock_change, operation = "set" } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
          data: null,
        });
      }

      if (stock_change === undefined || isNaN(stock_change)) {
        return res.status(400).json({
          success: false,
          message: "Stock change value is required and must be a number",
          data: null,
        });
      }

      const validOperations = ["set", "add", "subtract"];
      if (!validOperations.includes(operation)) {
        return res.status(400).json({
          success: false,
          message: `Invalid operation. Must be one of: ${validOperations.join(
            ", "
          )}`,
          data: null,
        });
      }

      // ตรวจสอบว่า product มีอยู่จริง
      const existingProduct = await ProductModel.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
          data: null,
        });
      }

      const updatedProduct = await ProductModel.updateStock(
        id,
        parseFloat(stock_change),
        operation
      );

      return res.status(200).json({
        success: true,
        message: `Stock ${operation}ed successfully`,
        data: updatedProduct,
        stock_change: {
          previous: existingProduct.pro_instock,
          current: updatedProduct.pro_instock,
          operation: operation,
          change: parseFloat(stock_change),
        },
      });
    } catch (error) {
      console.error("Error in updateStock:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // อัพเดท rating
  static async updateRating(req, res) {
    try {
      const { id } = req.params;
      const { rating } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
          data: null,
        });
      }

      if (rating === undefined || isNaN(rating) || rating < 0 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be a number between 0 and 5",
          data: null,
        });
      }

      // ตรวจสอบว่า product มีอยู่จริง
      const existingProduct = await ProductModel.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
          data: null,
        });
      }

      const updatedProduct = await ProductModel.updateRatingAndView(
        id,
        parseFloat(rating),
        false
      );

      return res.status(200).json({
        success: true,
        message: "Rating updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Error in updateRating:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ลบ product
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
          data: null,
        });
      }

      // ตรวจสอบว่า product มีอยู่จริง
      const existingProduct = await ProductModel.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
          data: null,
        });
      }

      const deletedProduct = await ProductModel.deleteProduct(id);

      return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
        data: deletedProduct,
      });
    } catch (error) {
      console.error("Error in deleteProduct:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงข้อมูล products ที่ stock ต่ำ
  static async getLowStockProducts(req, res) {
    try {
      const threshold = req.query.threshold
        ? parseInt(req.query.threshold)
        : 10;

      if (isNaN(threshold) || threshold < 0) {
        return res.status(400).json({
          success: false,
          message: "Threshold must be a valid positive number",
          data: null,
        });
      }

      const products = await ProductModel.getLowStockProducts(threshold);

      return res.status(200).json({
        success: true,
        message: "Low stock products retrieved successfully",
        data: products,
        count: products.length,
        threshold: threshold,
      });
    } catch (error) {
      console.error("Error in getLowStockProducts:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงข้อมูl products ตาม drug type
  static async getProductsByDrugType(req, res) {
    try {
      const { drugType } = req.params;

      if (!drugType) {
        return res.status(400).json({
          success: false,
          message: "Drug type is required",
          data: null,
        });
      }

      const products = await ProductModel.getProductsByDrugType(drugType);

      return res.status(200).json({
        success: true,
        message: `Products with drug type "${drugType}" retrieved successfully`,
        data: products,
        count: products.length,
        drugType: drugType,
      });
    } catch (error) {
      console.error("Error in getProductsByDrugType:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงข้อมูล products ยอดนิยม
  static async getPopularProducts(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;

      if (isNaN(limit) || limit <= 0) {
        return res.status(400).json({
          success: false,
          message: "Limit must be a valid positive number",
          data: null,
        });
      }

      const products = await ProductModel.getPopularProducts(limit);

      return res.status(200).json({
        success: true,
        message: "Popular products retrieved successfully",
        data: products,
        count: products.length,
        limit: limit,
      });
    } catch (error) {
      console.error("Error in getPopularProducts:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ดึงสถิติ products
  static async getProductStats(req, res) {
    try {
      const stats = await ProductModel.getProductStats();

      // Convert to numbers for easier use
      const formattedStats = {
        total_products: parseInt(stats.total_products),
        products_in_stock: parseInt(stats.products_in_stock),
        products_out_of_stock: parseInt(stats.products_out_of_stock),
        products_low_stock: parseInt(stats.products_low_stock),
        total_stock_quantity: parseFloat(stats.total_stock_quantity) || 0,
        average_price: parseFloat(stats.average_price) || 0,
        average_rating: parseFloat(stats.average_rating) || 0,
        total_views: parseInt(stats.total_views) || 0,
        high_rated_products: parseInt(stats.high_rated_products) || 0,
      };

      return res.status(200).json({
        success: true,
        message: "Product statistics retrieved successfully",
        data: formattedStats,
      });
    } catch (error) {
      console.error("Error in getProductStats:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // สร้าง product พร้อมกับ product_pharma ในครั้งเดียว
  static async addProductWithPharma(req, res) {
    const client = await pool.connect(); // Get client for transaction

    try {
      await client.query("BEGIN"); // Start transaction

      const { product, pharma } = req.body;

      // Validation ส่วน product
      if (!product) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Product data is required",
          data: null,
        });
      }

      const requiredProductFields = ["pro_code", "pro_name"];
      const missingProductFields = requiredProductFields.filter(
        (field) => !product[field]
      );

      if (missingProductFields.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: `Missing required product fields: ${missingProductFields.join(
            ", "
          )}`,
          data: null,
        });
      }

      // ตรวจสอบว่า pro_code ซ้ำหรือไม่
      const codeExists = await ProductModel.checkProductCodeExists(
        product.pro_code
      );
      if (codeExists) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Product code already exists",
          data: null,
        });
      }

      // Validate product data (เหมือนกับ addProduct)
      if (product.pro_instock !== undefined) {
        const stock = parseFloat(product.pro_instock);
        if (isNaN(stock) || stock < 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: "Product stock must be a valid positive number",
            data: null,
          });
        }
        product.pro_instock = stock;
      }

      // Validate prices
      ["pro_price1", "pro_price2", "pro_price3", "pro_pricethai"].forEach(
        (priceField) => {
          if (product[priceField] !== undefined) {
            const price = parseFloat(product[priceField]);
            if (isNaN(price) || price < 0) {
              throw new Error(`${priceField} must be a valid positive number`);
            }
            product[priceField] = price;
          }
        }
      );

      // Validate ratios
      ["pro_ratio1", "pro_ratio2", "pro_ratio3"].forEach((ratioField) => {
        if (product[ratioField] !== undefined) {
          const ratio = parseInt(product[ratioField]);
          if (isNaN(ratio) || ratio < 0) {
            throw new Error(`${ratioField} must be a valid positive integer`);
          }
          product[ratioField] = ratio;
        }
      });

      // Validate GLWA fields (0 or 1)
      for (let i = 1; i <= 10; i++) {
        const glwaField = `pro_glwa${i}`;
        if (product[glwaField] !== undefined) {
          if (!["0", "1"].includes(product[glwaField])) {
            throw new Error(`${glwaField} must be '0' or '1'`);
          }
        }
      }

      // Validate PS fields (0 or 1)
      for (let i = 1; i <= 8; i++) {
        const psField = `pro_ps${i}`;
        if (product[psField] !== undefined) {
          if (!["0", "1"].includes(product[psField])) {
            throw new Error(`${psField} must be '0' or '1'`);
          }
        }
      }

      // สร้าง product ก่อน (ใช้ transaction client)
      const newProduct = await ProductModel.createProduct(product, client);
      console.log("✅ Product created:", newProduct.pro_code);

      let newProductPharma = null;

      // สร้าง product_pharma ถ้ามีข้อมูล
      if (pharma && Object.keys(pharma).length > 0) {
        // เพิ่ม pp_procode จาก product code ที่เพิ่งสร้าง
        pharma.pp_procode = newProduct.pro_code;

        // Validate pharma data
        ["pp_eatamount", "pp_daypamount", "pp_print"].forEach((field) => {
          if (pharma[field] !== undefined) {
            const value = parseInt(pharma[field]);
            if (isNaN(value) || value < 0) {
              throw new Error(`${field} must be a valid positive number`);
            }
            pharma[field] = value;
          }
        });

        // สร้าง ProductPharmaModel ใน transaction
        const ProductPharmaModel = require("../model/productPharmaModel");
        newProductPharma = await ProductPharmaModel.createProductPharma(
          pharma,
          client
        );
        console.log("✅ Product pharma created for:", newProduct.pro_code);
      }

      await client.query("COMMIT"); // Commit transaction

      return res.status(201).json({
        success: true,
        message: "Product and product pharma created successfully",
        data: {
          product: newProduct,
          pharma: newProductPharma,
          created_with_pharma: !!newProductPharma,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK"); // Rollback on error
      console.error("Error in addProductWithPharma:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    } finally {
      client.release(); // Release client back to pool
    }
  }

  // ทดสอบการเชื่อมต่อ database
  static async testDatabase(req, res) {
    try {
      await ProductModel.testConnection();
      return res.status(200).json({
        success: true,
        message:
          "Database connection test completed. Check console for details.",
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

module.exports = ProductController;
