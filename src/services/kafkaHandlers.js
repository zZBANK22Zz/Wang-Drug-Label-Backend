// ===================================
// src/services/kafkaHandlers.js (FIXED WITH CONTROLLERS)
// ===================================
const axios = require('axios');
const { publishMessage } = require('../config/kafka');

// Import existing controllers to process data
const ProductController = require('../controller/productController');
const MemberController = require('../controller/memberController');

class KafkaMessageHandler {
  constructor() {
    this.containerRole = process.env.CONTAINER_ROLE || 'main';
    this.mainBackendUrl = process.env.MAIN_BACKEND_URL;
    this.secondBackendUrl = process.env.SECOND_BACKEND_URL;
    
    // 🆕 Track processed messages to prevent duplicates
    this.processedMessages = new Map();
  }

  async processMessage(message) {
    const { topic, value, key, offset, partition } = message;
    
    // 🔒 Create unique message ID for idempotency
    const messageId = `${topic}-${partition}-${offset}`;
    const keyId = key ? key.replace(/"/g, '') : null; // Remove quotes from key
    
    try {
      // 🔍 Check if this exact message was already processed
      if (this.processedMessages.has(messageId)) {
        console.log(`⏭️ ${this.containerRole} Backend: Message already processed, skipping:`, {
          messageId,
          topic,
          key: keyId
        });
        return;
      }

      console.log(`🔄 ${this.containerRole} Backend processing:`, {
        messageId,
        topic,
        eventType: value?.eventType,
        source: value?.source,
        key: keyId
      });
      
      switch (topic) {
        case 'product-events':
          await this.handleProductEvent(value, keyId, messageId);
          break;
        case 'member-events':
          await this.handleMemberEvent(value, keyId, messageId);
          break;
        case 'prescription-events':
          await this.handlePrescriptionEvent(value, keyId, messageId);
          break;
        case 'pharma-events':
          await this.handlePharmaEvent(value, keyId, messageId);
          break;
        case 'dead-letter-queue':
          await this.handleDeadLetterMessage(value, keyId);
          break;
        default:
          console.warn('🟡 Unknown topic:', topic);
          return;
      }
      
      // ✅ Mark message as processed
      this.processedMessages.set(messageId, {
        timestamp: Date.now(),
        topic,
        key: keyId,
        eventType: value?.eventType,
        container: this.containerRole
      });
      
      // 🧹 Clean up old processed messages (keep only last 1000)
      if (this.processedMessages.size > 1000) {
        const oldestKey = this.processedMessages.keys().next().value;
        this.processedMessages.delete(oldestKey);
      }
      
    } catch (error) {
      console.error('❌ Error processing message:', error);
      await this.handleFailedMessage(message, error);
    }
  }

  async handleProductEvent(data, key, messageId) {
    console.log('🛍️ Processing product event:', { 
      messageId,
      key, 
      eventType: data.eventType, 
      source: data.source,
      container: this.containerRole 
    });
    
    try {
      await this.processProductData(data, key, messageId);
    } catch (error) {
      console.error('❌ Product event processing failed:', error);
      throw error;
    }
  }

  async handleMemberEvent(data, key, messageId) {
    console.log('👤 Processing member event:', { 
      messageId,
      key, 
      eventType: data.eventType, 
      source: data.source,
      container: this.containerRole 
    });
    
    try {
      await this.processMemberData(data, key, messageId);
    } catch (error) {
      console.error('❌ Member event processing failed:', error);
      throw error;
    }
  }

  async handlePrescriptionEvent(data, key, messageId) {
    console.log('💊 Processing prescription event:', { 
      messageId,
      key, 
      eventType: data.eventType,
      container: this.containerRole 
    });
    
    console.log('⏭️ Prescription processing not implemented yet');
  }

  async handlePharmaEvent(data, key, messageId) {
    console.log('⚗️ Processing pharma event:', { 
      messageId,
      key, 
      eventType: data.eventType,
      container: this.containerRole 
    });
    
    console.log('⏭️ Pharma processing not implemented yet');
  }

  async handleDeadLetterMessage(data, key) {
    console.log('💀 Processing dead letter message:', { 
      key, 
      originalTopic: data.originalTopic,
      error: data.error,
      container: this.containerRole 
    });
  }

  // ===================================
  // 🔧 IDEMPOTENT Product Processing
  // ===================================
  async processProductData(data, key, messageId) {
    const { eventType, data: eventData, source } = data;
    
    try {
      console.log(`🛍️ Processing product data - Type: ${eventType}, Source: ${source}, MessageId: ${messageId}`);
      
      switch (eventType) {
        case 'ADD_PRODUCT_WITH_PHARMA':
          console.log('Creating product with pharma:', eventData.product?.pro_name || eventData.product?.name);
          await this.createProductWithPharmaIdempotent(eventData, key, messageId);
          break;
          
        case 'UPDATE_PRODUCT_WITH_PHARMA':
          console.log('Updating product with pharma:', eventData.productId || eventData.id);
          await this.updateProductWithPharmaIdempotent(eventData, key, messageId);
          break;
          
        case 'DELETE':
          console.log('Deleting product:', eventData.productId || eventData.id);
          console.log('⏭️ Delete product not implemented yet');
          break;
          
        case 'STOCK_UPDATE':
          console.log('Updating stock for product:', eventData.productId || eventData.id);
          console.log('⏭️ Stock update not implemented yet');
          break;
          
        case 'BULK_STOCK_UPDATE':
          console.log('Processing bulk stock update:', eventData.batch_id);
          console.log('⏭️ Bulk stock update not implemented yet');
          break;
          
        default:
          console.warn('Unknown product event type:', eventType);
      }
    } catch (error) {
      console.error('❌ Error processing product data:', error);
      throw error;
    }
  }

  // ===================================
  // 🔧 IDEMPOTENT Member Processing  
  // ===================================
  async processMemberData(data, key, messageId) {
    const { eventType, data: eventData, source } = data;
    
    try {
      console.log(`👤 Processing member data - Type: ${eventType}, Source: ${source}, MessageId: ${messageId}`);
      
      switch (eventType) {
        case 'ADD_MEMBER':
          console.log('Creating member:', eventData.mem_username || eventData.username);
          await this.createMemberIdempotent(eventData, key, messageId);
          break;
          
        case 'UPDATE_MEMBER':
          console.log('Updating member:', eventData.memberId || eventData.mem_username);
          await this.updateMemberIdempotent(eventData, key, messageId);
          break;
          
        case 'DELETE':
          console.log('Deleting member:', eventData.memberId || eventData.mem_username);
          console.log('⏭️ Delete member not implemented yet');
          break;
          
        default:
          console.warn('Unknown member event type:', eventType);
      }
    } catch (error) {
      console.error('❌ Error processing member data:', error);
      throw error;
    }
  }

  // ===================================
  // 🔒 IDEMPOTENT Product Methods
  // ===================================
  async createProductWithPharmaIdempotent(data, key, messageId) {
    const productCode = data.product?.pro_code;
    
    try {
      console.log(`🆕 Creating product with pharma (idempotent):`, data.product?.pro_name);
      console.log(`🔍 Checking if product exists: ${productCode}`);
      
      // 🔍 Check if product already exists
      const existingProduct = await this.checkProductExists(productCode);
      
      if (existingProduct) {
        console.log(`⚠️ Product ${productCode} already exists, skipping creation:`, {
          messageId,
          container: this.containerRole,
          existingProduct: existingProduct.pro_name
        });
        return {
          status: 'skipped',
          reason: 'product_already_exists',
          productCode,
          container: this.containerRole
        };
      }
      
      // 🆕 Product doesn't exist, proceed with creation using controller
      const mockReq = {
        body: {
          product: data.product,
          pharma: data.pharma
        }
      };
      
      const mockRes = {
        status: (code) => ({
          json: (result) => {
            if (code === 201) {
              console.log(`✅ Product created successfully:`, result.data?.product?.pro_code);
            } else {
              console.error(`❌ Product creation failed (${code}):`, result.message);
              
              // 🔍 Check if it's a duplicate error
              if (result.message && result.message.includes('duplicate key')) {
                console.log(`🔄 Duplicate detected during creation, product may have been created by another backend`);
                return result; // Don't throw error for duplicates
              }
              
              throw new Error(result.message);
            }
            return result;
          }
        }),
        json: (result) => {
          console.log(`✅ Product created:`, result.data?.product?.pro_code);
          return result;
        }
      };
      
      await ProductController.addProductWithPharma(mockReq, mockRes);
      
      console.log(`✅ ${this.containerRole} Backend successfully created product: ${productCode}`);
      
    } catch (error) {
      // 🔍 Handle duplicate key errors gracefully
      if (error.message && (error.message.includes('duplicate key') || error.message.includes('already exists'))) {
        console.log(`⚠️ Product ${productCode} was created by another backend during processing:`, {
          messageId,
          container: this.containerRole,
          error: error.message
        });
        return {
          status: 'duplicate_handled',
          reason: 'created_by_another_backend',
          productCode,
          container: this.containerRole
        };
      }
      
      console.error(`❌ Create product with pharma failed:`, error);
      throw error;
    }
  }

  async updateProductWithPharmaIdempotent(data, key, messageId) {
    try {
      console.log(`🔄 Updating product with pharma (idempotent):`, data.productId || data.pro_code);
      
      const mockReq = {
        params: { id: data.productId },
        body: {
          product: data.product,
          pharma: data.pharma
        }
      };
      
      const mockRes = {
        status: (code) => ({
          json: (result) => {
            if (code === 200) {
              console.log(`✅ Product updated successfully:`, result.data?.product?.pro_code);
            } else {
              console.error(`❌ Product update failed (${code}):`, result.message);
              throw new Error(result.message);
            }
            return result;
          }
        }),
        json: (result) => {
          console.log(`✅ Product updated:`, result.data?.product?.pro_code);
          return result;
        }
      };
      
      await ProductController.updateProductWithPharma(mockReq, mockRes);
      
    } catch (error) {
      console.error(`❌ Update product with pharma failed:`, error);
      throw error;
    }
  }

  // ===================================
  // 🔒 IDEMPOTENT Member Methods (USING CONTROLLERS)
  // ===================================
  async createMemberIdempotent(data, key, messageId) {
    try {
      console.log(`👤 Creating member (idempotent):`, data.mem_username);
      
      // 🔍 Check if member already exists
      const existingMember = await this.checkMemberExists(data.mem_username);
      
      if (existingMember) {
        console.log(`⚠️ Member ${data.mem_username} already exists, skipping creation:`, {
          messageId,
          container: this.containerRole,
          existingMember: existingMember.mem_nameSite
        });
        return {
          status: 'skipped',
          reason: 'member_already_exists',
          username: data.mem_username,
          container: this.containerRole
        };
      }
      
      // Generate password for external members if not provided
      if (!data.mem_password) {
        data.mem_password = this.generatePassword();
        console.log(`🔑 Generated password for external member: ${data.mem_username}`);
      }
      
      // ✅ USE MEMBER CONTROLLER
      const mockReq = { body: data };
      const mockRes = {
        status: (code) => ({
          json: (result) => {
            if (code === 201) {
              console.log(`✅ Member created successfully:`, result.data?.mem_username);
            } else {
              console.error(`❌ Member creation failed (${code}):`, result.message);
              
              // Handle duplicate gracefully  
              if (result.message && result.message.includes('duplicate')) {
                console.log(`🔄 Duplicate member detected during creation`);
                return result;
              }
              
              throw new Error(result.message);
            }
            return result;
          }
        }),
        json: (result) => {
          console.log(`✅ Member created:`, result.data?.mem_username);
          return result;
        }
      };
      
      // 🔧 USE ACTUAL MemberController.addMember
      try {
        console.log(`🔧 Using MemberController.addMember`);
        await MemberController.addMember(mockReq, mockRes);
      } catch (controllerError) {
        console.error(`❌ MemberController.addMember failed:`, controllerError.message);
        
        // Handle duplicate errors gracefully
        if (controllerError.message.includes('already exists') || controllerError.message.includes('duplicate')) {
          console.log(`⚠️ Duplicate member detected in controller`);
          return {
            status: 'duplicate_handled',
            reason: 'member_already_exists_controller',
            username: data.mem_username,
            container: this.containerRole
          };
        }
        
        throw controllerError;
      }
      
    } catch (error) {
      // Handle duplicate key errors gracefully
      if (error.code === '23505' && error.constraint === 'member_mem_username_key') {
        console.log(`⚠️ Member ${data.mem_username} was created by another backend:`, {
          messageId,
          container: this.containerRole
        });
        return {
          status: 'duplicate_handled',
          reason: 'created_by_another_backend',
          username: data.mem_username,
          container: this.containerRole
        };
      }
      
      console.error(`❌ Create member failed:`, error);
      throw error;
    }
  }

  async updateMemberIdempotent(data, key, messageId) {
    try {
      const memberId = data.memberId || data.mem_username;
      console.log(`🔄 Updating member (idempotent):`, memberId);
      
      // 🔍 First, get member ID from username (since controller needs ID)
      let memberIdForController = memberId;
      
      // If memberId is username, need to find actual ID
      if (isNaN(memberId)) {
        console.log(`🔍 Looking up member ID for username: ${memberId}`);
        const existingMember = await this.getMemberByUsername(memberId);
        
        if (!existingMember) {
          throw new Error(`Member not found: ${memberId}`);
        }
        
        memberIdForController = existingMember.mem_id;
        console.log(`✅ Found member ID: ${memberIdForController} for username: ${memberId}`);
      }
      
      // ✅ USE MemberController.updateMember with correct ID
      const mockReq = {
        params: { id: memberIdForController }, // Use actual member ID
        body: data
      };
      
      const mockRes = {
        status: (code) => ({
          json: (result) => {
            if (code === 200) {
              console.log(`✅ Member updated successfully:`, result.data?.mem_username);
            } else {
              console.error(`❌ Member update failed (${code}):`, result.message);
              throw new Error(result.message);
            }
            return result;
          }
        }),
        json: (result) => {
          console.log(`✅ Member updated:`, result.data?.mem_username);
          return result;
        }
      };
      
      // 🔧 USE ACTUAL MemberController.updateMember
      try {
        console.log(`🔧 Using MemberController.updateMember with ID: ${memberIdForController}`);
        await MemberController.updateMember(mockReq, mockRes);
      } catch (controllerError) {
        console.error(`❌ MemberController.updateMember failed:`, controllerError.message);
        
        // If controller fails, fallback to direct DB
        console.log(`⚠️ Falling back to direct DB update`);
        await this.updateMemberDirect(data);
      }
      
    } catch (error) {
      console.error(`❌ Update member failed:`, error);
      throw error;
    }
  }

  // ===================================
  // 🔧 DIRECT DB OPERATIONS (FALLBACK)
  // ===================================
  async createMemberDirect(data) {
    try {
      console.log(`🔧 Creating member directly in database:`, data.mem_username);
      
      const pool = require('../config/database');
      
      const query = `
        INSERT INTO member (
          mem_username, mem_password, mem_nameSite, mem_license, mem_type,
          mem_province, mem_address, mem_amphur, mem_tumbon, mem_post,
          mem_taxid, mem_office, mem_daystart, mem_dayend, mem_timestart,
          mem_timeend, mem_price, mem_comments
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `;
      
      const values = [
        data.mem_username, data.mem_password, data.mem_nameSite,
        data.mem_license, data.mem_type || 1, data.mem_province,
        data.mem_address, data.mem_amphur, data.mem_tumbon,
        data.mem_post, data.mem_taxid, data.mem_office || "1",
        data.mem_daystart, data.mem_dayend, data.mem_timestart,
        data.mem_timeend, data.mem_price, data.mem_comments
      ];
      
      const result = await pool.query(query, values);
      
      console.log(`✅ Member created directly:`, {
        username: result.rows[0].mem_username,
        nameSite: result.rows[0].mem_nameSite,
        container: this.containerRole
      });
      
    } catch (error) {
      console.error(`❌ Direct member creation failed:`, error);
      throw error;
    }
  }

  async updateMemberDirect(data) {
    try {
      const memberId = data.memberId || data.mem_username;
      console.log(`🔧 Updating member directly in database:`, memberId);
      
      const pool = require('../config/database');
      
      // Build dynamic update query with PROPER parameter binding
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      const updatableFields = [
        'mem_password', 'mem_nameSite', 'mem_license', 'mem_type',
        'mem_province', 'mem_address', 'mem_amphur', 'mem_tumbon',
        'mem_post', 'mem_taxid', 'mem_office', 'mem_daystart',
        'mem_dayend', 'mem_timestart', 'mem_timeend', 'mem_price', 'mem_comments'
      ];
      
      updatableFields.forEach(field => {
        if (data[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);  // ✅ FIXED: Use $paramIndex
          values.push(data[field]);
          paramIndex++;
        }
      });
      
      if (updateFields.length === 0) {
        console.log(`⚠️ No fields to update for member: ${memberId}`);
        return;
      }
      
      const query = `
        UPDATE member 
        SET ${updateFields.join(', ')}
        WHERE mem_username = $${paramIndex}
        RETURNING *
      `;
      
      values.push(memberId);
      
      console.log(`🔍 Direct updating member: ${memberId}, fields: ${updateFields.length}`);
      console.log(`🔍 Query:`, query);
      console.log(`🔍 Values:`, values);
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Member not found: ${memberId}`);
      }
      
      console.log(`✅ Member updated directly:`, {
        username: result.rows[0].mem_username,
        nameSite: result.rows[0].mem_nameSite,
        updatedFields: updateFields.length
      });
      
    } catch (error) {
      console.error(`❌ Direct member update failed:`, error);
      throw error;
    }
  }

  // ===================================
  // 🔍 Helper Methods
  // ===================================
  async checkProductExists(productCode) {
    try {
      const pool = require('../config/database');
      const result = await pool.query(
        'SELECT pro_code, pro_name FROM product WHERE pro_code = $1',
        [productCode]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Error checking product existence:', error);
      return null;
    }
  }

  async checkMemberExists(username) {
    try {
      const pool = require('../config/database');
      const result = await pool.query(
        'SELECT mem_username, mem_nameSite FROM member WHERE mem_username = $1',
        [username]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Error checking member existence:', error);
      return null;
    }
  }

  async getMemberByUsername(username) {
    try {
      const pool = require('../config/database');
      const result = await pool.query(
        'SELECT mem_id, mem_username, mem_nameSite FROM member WHERE mem_username = $1',
        [username]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Error getting member by username:', error);
      return null;
    }
  }

  async handleFailedMessage(message, error) {
    console.error('💥 Message processing failed:', {
      topic: message.topic,
      key: message.key,
      error: error.message,
      container: this.containerRole
    });

    try {
      await publishMessage('dead-letter-queue', {
        originalMessage: message,
        error: error.message,
        timestamp: Date.now(),
        containerRole: this.containerRole
      });
    } catch (dlqError) {
      console.error('❌ Failed to send to dead letter queue:', dlqError);
    }
  }

  generatePassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

module.exports = KafkaMessageHandler;