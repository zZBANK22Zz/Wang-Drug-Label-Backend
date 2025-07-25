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
  }

  async processMessage(message) {
    const { topic, value, key } = message;
    
    try {
      console.log(`🔄 Processing message - Topic: ${topic}, Container: ${this.containerRole}`);
      
      switch (topic) {
        case 'product-events':
          await this.handleProductEvent(value, key);
          break;
        case 'member-events':
          await this.handleMemberEvent(value, key);
          break;
        case 'prescription-events':
          await this.handlePrescriptionEvent(value, key);
          break;
        case 'pharma-events':
          await this.handlePharmaEvent(value, key);
          break;
        case 'dead-letter-queue':
          await this.handleDeadLetterMessage(value, key);
          break;
        default:
          console.warn('🟡 Unknown topic:', topic);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      await this.handleFailedMessage(message, error);
    }
  }

  async handleProductEvent(data, key) {
    console.log('🛍️ Processing product event:', { 
      key, 
      eventType: data.eventType, 
      source: data.source,
      container: this.containerRole 
    });
    
    if (this.containerRole === 'secondary') {
      // Second backend: Forward to main backend
      await this.forwardToMainBackend('product', data);
    } else {
      // Main backend: Process directly
      await this.processProductData(data);
    }
  }

  async handleMemberEvent(data, key) {
    console.log('👤 Processing member event:', { 
      key, 
      eventType: data.eventType, 
      source: data.source,
      container: this.containerRole 
    });
    
    if (this.containerRole === 'secondary') {
      // Second backend: Forward to main backend
      await this.forwardToMainBackend('member', data);
    } else {
      // Main backend: Process directly
      await this.processMemberData(data);
    }
  }

  async handlePrescriptionEvent(data, key) {
    console.log('💊 Processing prescription event:', { 
      key, 
      eventType: data.eventType,
      container: this.containerRole 
    });
    
    if (this.containerRole === 'secondary') {
      await this.forwardToMainBackend('prescription', data);
    } else {
      await this.processPrescriptionData(data);
    }
  }

  async handlePharmaEvent(data, key) {
    console.log('⚗️ Processing pharma event:', { 
      key, 
      eventType: data.eventType,
      container: this.containerRole 
    });
    
    if (this.containerRole === 'secondary') {
      await this.forwardToMainBackend('pharma', data);
    } else {
      await this.processPharmaData(data);
    }
  }

  async handleDeadLetterMessage(data, key) {
    console.log('💀 Processing dead letter message:', { 
      key, 
      originalTopic: data.originalTopic,
      error: data.error,
      container: this.containerRole 
    });
    
    // Log for monitoring/alerting
    // TODO: Implement proper dead letter handling (retry, alert, etc.)
  }

  async forwardToMainBackend(dataType, data) {
    try {
      const response = await axios.post(
        `${this.mainBackendUrl}/api/internal/${dataType}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Request': 'true',
            'X-Source-Container': this.containerRole
          },
          timeout: 10000
        }
      );

      console.log('✅ Forwarded to main backend:', { 
        dataType, 
        status: response.status,
        container: response.data?.container 
      });
    } catch (error) {
      console.error('❌ Failed to forward to main backend:', error.message);
      
      // If main backend is down, try to process locally or queue for retry
      if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
        console.log('🔄 Main backend unavailable, processing locally...');
        await this.processDataLocally(dataType, data);
      } else {
        throw error;
      }
    }
  }

  async processProductData(data) {
    const { eventType, productData, source } = data;
    
    try {
      console.log(`🛍️ Processing product data - Type: ${eventType}, Source: ${source}`);
      
      switch (eventType) {
        case 'CREATE':
          console.log('Creating product:', productData.pro_name || productData.name);
          // TODO: เรียกใช้ ProductController.addProduct หรือ database operation
          // await this.createProduct(productData);
          break;
          
        case 'UPDATE':
          console.log('Updating product:', productData.pro_id || productData.id);
          // TODO: เรียกใช้ ProductController.updateProduct
          // await this.updateProduct(productData);
          break;
          
        case 'DELETE':
          console.log('Deleting product:', productData.pro_id || productData.id);
          // TODO: เรียกใช้ ProductController.deleteProduct
          // await this.deleteProduct(productData);
          break;
          
        case 'STOCK_UPDATE':
          console.log('Updating stock for product:', productData.pro_id || productData.id);
          // TODO: เรียกใช้ ProductController.updateStock
          // await this.updateProductStock(productData);
          break;
          
        default:
          console.warn('Unknown product event type:', eventType);
      }
    } catch (error) {
      console.error('❌ Error processing product data:', error);
      throw error;
    }
  }

  async processMemberData(data) {
    const { eventType, memberData, source } = data;
    
    try {
      console.log(`👤 Processing member data - Type: ${eventType}, Source: ${source}`);
      
      switch (eventType) {
        case 'CREATE':
          console.log('Creating member:', memberData.mem_username || memberData.username);
          // TODO: เรียกใช้ MemberController.addMember
          // await this.createMember(memberData);
          break;
          
        case 'UPDATE':
          console.log('Updating member:', memberData.mem_id || memberData.id);
          // TODO: เรียกใช้ MemberController.updateMember
          // await this.updateMember(memberData);
          break;
          
        case 'DELETE':
          console.log('Deleting member:', memberData.mem_id || memberData.id);
          // TODO: เรียกใช้ MemberController.deleteMember
          // await this.deleteMember(memberData);
          break;
          
        default:
          console.warn('Unknown member event type:', eventType);
      }
    } catch (error) {
      console.error('❌ Error processing member data:', error);
      throw error;
    }
  }

  async processPrescriptionData(data) {
    const { eventType, prescriptionData, source } = data;
    
    try {
      console.log(`💊 Processing prescription data - Type: ${eventType}, Source: ${source}`);
      
      switch (eventType) {
        case 'CREATE':
          console.log('Creating prescription log');
          // TODO: เรียกใช้ PrescriptionLogsController
          break;
          
        case 'UPDATE':
          console.log('Updating prescription log');
          // TODO: เรียกใช้ PrescriptionLogsController
          break;
          
        default:
          console.warn('Unknown prescription event type:', eventType);
      }
    } catch (error) {
      console.error('❌ Error processing prescription data:', error);
      throw error;
    }
  }

  async processPharmaData(data) {
    const { eventType, pharmaData, source } = data;
    
    try {
      console.log(`⚗️ Processing pharma data - Type: ${eventType}, Source: ${source}`);
      
      switch (eventType) {
        case 'VERIFY_REQUEST':
          console.log('Processing pharma verification request');
          // TODO: เรียกใช้ pharma verify logic
          break;
          
        case 'PERSONAL_UPDATE':
          console.log('Updating personal pharma data');
          // TODO: เรียกใช้ PharmaPersonalController
          break;
          
        default:
          console.warn('Unknown pharma event type:', eventType);
      }
    } catch (error) {
      console.error('❌ Error processing pharma data:', error);
      throw error;
    }
  }

  async processDataLocally(dataType, data) {
    // Process data locally when main backend is unavailable
    try {
      console.log(`🔄 Processing ${dataType} locally due to main backend unavailability`);
      
      if (dataType === 'product') {
        await this.processProductData(data);
      } else if (dataType === 'member') {
        await this.processMemberData(data);
      } else if (dataType === 'prescription') {
        await this.processPrescriptionData(data);
      } else if (dataType === 'pharma') {
        await this.processPharmaData(data);
      }
    } catch (error) {
      console.error('❌ Error processing data locally:', error);
      // Queue for retry when main backend is back online
      await this.queueForRetry(dataType, data);
    }
  }

  async queueForRetry(dataType, data) {
    // Publish to retry topic or store in database for later processing
    try {
      await publishMessage(`${dataType}-retry`, {
        originalData: data,
        retryCount: (data.retryCount || 0) + 1,
        timestamp: Date.now(),
        containerRole: this.containerRole
      });
      console.log('📝 Queued for retry:', dataType);
    } catch (error) {
      console.error('❌ Failed to queue for retry:', error);
    }
  }

  async handleFailedMessage(message, error) {
    console.error('💥 Message processing failed:', {
      topic: message.topic,
      key: message.key,
      error: error.message,
      container: this.containerRole
    });

    // Implement dead letter queue logic
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

  // Helper methods สำหรับจัดการข้อมูล (TODO: implement เมื่อต้องการ)
  async createProduct(productData) {
    // Implementation for creating product
    console.log('Creating product in database:', productData);
  }

  async updateProduct(productData) {
    // Implementation for updating product
    console.log('Updating product in database:', productData);
  }

  async deleteProduct(productData) {
    // Implementation for deleting product
    console.log('Deleting product from database:', productData);
  }

  async createMember(memberData) {
    // Implementation for creating member
    console.log('Creating member in database:', memberData);
  }

  async updateMember(memberData) {
    // Implementation for updating member
    console.log('Updating member in database:', memberData);
  }

  async deleteMember(memberData) {
    // Implementation for deleting member
    console.log('Deleting member from database:', memberData);
  }
}

module.exports = KafkaMessageHandler;