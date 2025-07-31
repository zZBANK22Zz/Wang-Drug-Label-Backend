const pool = require("../config/database");

class ProductModel {
  // ตรวจสอบ table structure
  static async getTableStructure() {
    try {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'product'
        ORDER BY ordinal_position
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // สร้าง product ใหม่ (แก้ไขแล้ว) - รองรับ transaction
  static async createProduct(productData, client = null) {
    const dbClient = client || pool; // ใช้ client ที่ส่งมา หรือ pool ปกติ

    const {
      pro_code,
      pro_name,
      pro_proname,
      pro_nameeng,
      pro_nameth,
      pro_genericname,
      pro_drugmain,
      pro_keysearch,
      pro_unit1,
      pro_ratio1,
      pro_unit2,
      pro_ratio2,
      pro_unit3,
      pro_ratio3,
      pro_supplies,
      pro_barcode1,
      pro_barcode2,
      pro_barcode3,
      pro_price1,
      pro_price2,
      pro_price3,
      pro_limitcontrol,
      pro_pricethai,
      pro_instock = 0.0,
      pro_imgmain,
      pro_img,
      pro_imgu1,
      pro_imgu2,
      pro_imgu3,
      pro_glwa1 = "0",
      pro_glwa2 = "0",
      pro_glwa3 = "0",
      pro_glwa4 = "0",
      pro_glwa5 = "0",
      pro_glwa6 = "0",
      pro_glwa7 = "0",
      pro_glwa8 = "0",
      pro_glwa9 = "0",
      pro_glwa10 = "0",
      pro_drugregister,
      pro_ps1 = "0",
      pro_ps2 = "0",
      pro_ps3 = "0",
      pro_ps4 = "0",
      pro_ps5 = "0",
      pro_ps6 = "0",
      pro_ps7 = "0",
      pro_ps8 = "0",
      pro_point = 0,
      pro_view = 0,
      pro_rating = 0.0,
    } = productData;

    // แก้ไข: ใช้ VALUES เท่ากับ columns (51 ตัว)
    const query = `
      INSERT INTO product (
        pro_code, pro_name, pro_proname, pro_nameeng, pro_nameth, pro_genericname,
        pro_drugmain, pro_keysearch, pro_unit1, pro_ratio1, pro_unit2, pro_ratio2,
        pro_unit3, pro_ratio3, pro_supplies, pro_barcode1, pro_barcode2, pro_barcode3,
        pro_price1, pro_price2, pro_price3, pro_limitcontrol, pro_pricethai, pro_instock,
        pro_imgmain, pro_img, pro_imgu1, pro_imgu2, pro_imgu3, pro_glwa1, pro_glwa2,
        pro_glwa3, pro_glwa4, pro_glwa5, pro_glwa6, pro_glwa7, pro_glwa8, pro_glwa9,
        pro_glwa10, pro_drugregister, pro_ps1, pro_ps2, pro_ps3, pro_ps4, pro_ps5,
        pro_ps6, pro_ps7, pro_ps8, pro_point, pro_view, pro_rating
      ) 
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
        $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51
      ) 
      RETURNING *
    `;

    const values = [
      pro_code,
      pro_name,
      pro_proname || null,
      pro_nameeng || null,
      pro_nameth || null,
      pro_genericname || null,
      pro_drugmain || null,
      pro_keysearch || null,
      pro_unit1 || null,
      pro_ratio1 || null,
      pro_unit2 || null,
      pro_ratio2 || null,
      pro_unit3 || null,
      pro_ratio3 || null,
      pro_supplies || null,
      pro_barcode1 || null,
      pro_barcode2 || null,
      pro_barcode3 || null,
      pro_price1 || null,
      pro_price2 || null,
      pro_price3 || null,
      pro_limitcontrol || null,
      pro_pricethai || null,
      pro_instock,
      pro_imgmain || null,
      pro_img || null,
      pro_imgu1 || null,
      pro_imgu2 || null,
      pro_imgu3 || null,
      pro_glwa1,
      pro_glwa2,
      pro_glwa3,
      pro_glwa4,
      pro_glwa5,
      pro_glwa6,
      pro_glwa7,
      pro_glwa8,
      pro_glwa9,
      pro_glwa10,
      pro_drugregister || null,
      pro_ps1,
      pro_ps2,
      pro_ps3,
      pro_ps4,
      pro_ps5,
      pro_ps6,
      pro_ps7,
      pro_ps8,
      pro_point,
      pro_view,
      pro_rating,
    ];

    try {
      console.log("🔍 Creating product with:", {
        columnsCount: 51,
        valuesCount: values.length,
        productData: { pro_code, pro_name, pro_instock },
      });

      const result = await dbClient.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Create product error:", error.message);
      console.error("Query:", query);
      console.error("Values length:", values.length);
      throw error;
    }
  }

  // สร้าง product แบบ minimal (สำหรับทดสอบ)
  static async createMinimalProduct(productData) {
    const { pro_code, pro_name, pro_instock = 0.0 } = productData;

    const query = `
      INSERT INTO product (pro_code, pro_name, pro_instock) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;

    const values = [pro_code, pro_name, pro_instock];

    try {
      console.log("🔍 Creating minimal product:", {
        pro_code,
        pro_name,
        pro_instock,
      });
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Create minimal product error:", error.message);
      throw error;
    }
  }

  // ดึงข้อมูล product ทั้งหมด
  static async getAllProducts(filters = {}) {
    let query = "SELECT * FROM product WHERE 1=1";
    const values = [];
    let paramIndex = 1;

    // Search by product name or code
    if (filters.search) {
      query += ` AND (pro_name ILIKE $${paramIndex} OR pro_code ILIKE $${paramIndex} OR pro_proname ILIKE $${paramIndex} OR pro_keysearch ILIKE $${paramIndex})`;
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Filter by drug type
    if (filters.drug_type) {
      query += ` AND pro_drugmain ILIKE $${paramIndex}`;
      values.push(`%${filters.drug_type}%`);
      paramIndex++;
    }

    // Filter by stock status
    if (filters.stock_status) {
      if (filters.stock_status === "low") {
        query += ` AND pro_instock <= 10`;
      } else if (filters.stock_status === "out") {
        query += ` AND pro_instock = 0`;
      } else if (filters.stock_status === "available") {
        query += ` AND pro_instock > 0`;
      }
    }

    // Filter by price range
    if (filters.min_price) {
      query += ` AND pro_price1 >= $${paramIndex}`;
      values.push(parseFloat(filters.min_price));
      paramIndex++;
    }

    if (filters.max_price) {
      query += ` AND pro_price1 <= $${paramIndex}`;
      values.push(parseFloat(filters.max_price));
      paramIndex++;
    }

    // Filter by rating
    if (filters.min_rating) {
      query += ` AND pro_rating >= $${paramIndex}`;
      values.push(parseFloat(filters.min_rating));
      paramIndex++;
    }

    // Sorting
    const sortBy = filters.sort_by || "pro_id";
    const sortOrder = filters.sort_order || "DESC";
    const allowedSortFields = [
      "pro_id",
      "pro_name",
      "pro_code",
      "pro_price1",
      "pro_instock",
      "pro_rating",
      "pro_view",
    ];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "pro_id";
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

  // ดึงข้อมูล product ตาม ID
  static async getProductById(id) {
    const query = "SELECT * FROM product WHERE pro_id = $1";

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล product ตาม code
  static async getProductByCode(pro_code) {
    const query = "SELECT * FROM product WHERE pro_code = $1";

    try {
      const result = await pool.query(query, [pro_code]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล product ตาม barcode (รองรับ 3 barcode)
  static async getProductByBarcode(barcode) {
    const query =
      "SELECT * FROM product WHERE pro_barcode1 = $1 OR pro_barcode2 = $1 OR pro_barcode3 = $1";

    try {
      const result = await pool.query(query, [barcode]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ตรวจสอบว่า pro_code ซ้ำหรือไม่
  static async checkProductCodeExists(pro_code) {
    const query = "SELECT COUNT(*) FROM product WHERE pro_code = $1";

    try {
      const result = await pool.query(query, [pro_code]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // ตรวจสอบว่า pro_code ซ้ำหรือไม่ (ยกเว้น product ปัจจุบัน)
  static async checkProductCodeExistsForUpdate(pro_code, exclude_pro_id) {
    const query =
      "SELECT COUNT(*) FROM product WHERE pro_code = $1 AND pro_id != $2";

    try {
      const result = await pool.query(query, [pro_code, exclude_pro_id]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // อัพเดทข้อมูล product (รองรับ transaction)
  static async updateProduct(pro_id, updateData, client = null) {
    const dbClient = client || pool; // ใช้ client ที่ส่งมา หรือ pool ปกติ

    try {
      // สร้าง dynamic query เฉพาะ fields ที่ส่งมา
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Define allowed fields for update
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

      // Build dynamic update query
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex++}`);
          values.push(updateData[field]);
        }
      }

      if (updateFields.length === 0) {
        throw new Error("ไม่มีข้อมูลที่จะอัพเดท");
      }

      // Add pro_id for WHERE clause
      values.push(pro_id);

      const query = `
      UPDATE product 
      SET ${updateFields.join(", ")}
      WHERE pro_id = $${paramIndex}
      RETURNING *
    `;

      console.log("🔍 Updating product:", {
        pro_id,
        fieldsToUpdate: updateFields.length,
        usingTransaction: !!client,
      });

      const result = await dbClient.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Update product error:", error.message);
      throw error;
    }
  }

  // ตรวจสอบว่า pro_code ซ้ำหรือไม่ (ยกเว้น product ปัจจุบัน) - รองรับ transaction
  static async checkProductCodeExistsForUpdate(
    pro_code,
    exclude_pro_id,
    client = null
  ) {
    const dbClient = client || pool; // ใช้ client ที่ส่งมา หรือ pool ปกติ
    const query =
      "SELECT COUNT(*) FROM product WHERE pro_code = $1 AND pro_id != $2";

    try {
      const result = await dbClient.query(query, [pro_code, exclude_pro_id]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล product ตาม code - รองรับ transaction
  static async getProductByCode(pro_code, client = null) {
    const dbClient = client || pool; // ใช้ client ที่ส่งมา หรือ pool ปกติ
    const query = "SELECT * FROM product WHERE pro_code = $1";

    try {
      const result = await dbClient.query(query, [pro_code]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล product ตาม ID - รองรับ transaction
  static async getProductById(id, client = null) {
    const dbClient = client || pool; // ใช้ client ที่ส่งมา หรือ pool ปกติ
    const query = "SELECT * FROM product WHERE pro_id = $1";

    try {
      const result = await dbClient.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // อัพเดท stock สินค้า
  static async updateStock(pro_id, stock_change, operation = "set") {
    let query;
    let values;

    if (operation === "add") {
      query = `
        UPDATE product 
        SET pro_instock = pro_instock + $1
        WHERE pro_id = $2
        RETURNING *
      `;
      values = [stock_change, pro_id];
    } else if (operation === "subtract") {
      query = `
        UPDATE product 
        SET pro_instock = GREATEST(pro_instock - $1, 0)
        WHERE pro_id = $2
        RETURNING *
      `;
      values = [stock_change, pro_id];
    } else {
      // operation === 'set'
      query = `
        UPDATE product 
        SET pro_instock = $1
        WHERE pro_id = $2
        RETURNING *
      `;
      values = [stock_change, pro_id];
    }

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // อัพเดท rating และ view
  static async updateRatingAndView(
    pro_id,
    rating = null,
    increment_view = false
  ) {
    let query;
    let values;

    if (rating !== null && increment_view) {
      query = `
        UPDATE product 
        SET pro_rating = $1, pro_view = pro_view + 1
        WHERE pro_id = $2
        RETURNING *
      `;
      values = [rating, pro_id];
    } else if (rating !== null) {
      query = `
        UPDATE product 
        SET pro_rating = $1
        WHERE pro_id = $2
        RETURNING *
      `;
      values = [rating, pro_id];
    } else if (increment_view) {
      query = `
        UPDATE product 
        SET pro_view = pro_view + 1
        WHERE pro_id = $1
        RETURNING *
      `;
      values = [pro_id];
    } else {
      throw new Error("No update operation specified");
    }

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ลบ product
  static async deleteProduct(pro_id) {
    const query = "DELETE FROM product WHERE pro_id = $1 RETURNING *";

    try {
      const result = await pool.query(query, [pro_id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล products ที่ stock ต่ำ
  static async getLowStockProducts(threshold = 10) {
    const query = `
      SELECT * FROM product 
      WHERE pro_instock <= $1 
      ORDER BY pro_instock ASC, pro_name ASC
    `;

    try {
      const result = await pool.query(query, [threshold]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล products ตาม drug type
  static async getProductsByDrugType(drugType) {
    const query = `
      SELECT * FROM product 
      WHERE pro_drugmain ILIKE $1 
      ORDER BY pro_name ASC
    `;

    try {
      const result = await pool.query(query, [`%${drugType}%`]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // ดึงข้อมูล products ยอดนิยม (ตาม view และ rating)
  static async getPopularProducts(limit = 10) {
    const query = `
      SELECT * FROM product 
      WHERE pro_view > 0 
      ORDER BY pro_rating DESC, pro_view DESC, pro_name ASC
      LIMIT $1
    `;

    try {
      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // สถิติ products
  static async getProductStats() {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN pro_instock > 0 THEN 1 END) as products_in_stock,
        COUNT(CASE WHEN pro_instock = 0 THEN 1 END) as products_out_of_stock,
        COUNT(CASE WHEN pro_instock <= 10 THEN 1 END) as products_low_stock,
        SUM(pro_instock) as total_stock_quantity,
        AVG(pro_price1) as average_price,
        AVG(pro_rating) as average_rating,
        SUM(pro_view) as total_views,
        COUNT(CASE WHEN pro_rating >= 4.0 THEN 1 END) as high_rated_products
      FROM product
    `;

    try {
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ทดสอบการเชื่อมต่อและดูตาราง
  static async testConnection() {
    try {
      const result = await pool.query("SELECT NOW() as current_time");
      console.log("✅ Database connected:", result.rows[0]);

      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      console.log(
        "📋 Available tables:",
        tables.rows.map((row) => row.table_name)
      );

      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'product'
        ORDER BY ordinal_position
      `);

      if (columns.rows.length > 0) {
        console.log("🏗️ Product table columns:", columns.rows);
      }
    } catch (error) {
      console.error("❌ Database connection error:", error.message);
    }
  }
}

module.exports = ProductModel;
