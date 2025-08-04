// ===================================
// src/routes/internalRoutes.js (NEW FILE)
// ===================================
const express = require('express');
const ProductController = require('../controller/productController');
const MemberController = require('../controller/memberController');

const router = express.Router();

// Middleware สำหรับ internal requests
const validateInternalRequest = (req, res, next) => {
  const isInternal = req.headers['x-internal-request'] === 'true';
  const sourceContainer = req.headers['x-source-container'];
  
  if (!isInternal) {
    return res.status(403).json({
      success: false,
      message: 'Access denied - Internal API only',
      data: null
    });
  }
  
  console.log(`🔗 Internal request from: ${sourceContainer}`);
  next();
};

// ===================================
// Product Internal Routes
// ===================================
router.post('/product', validateInternalRequest, async (req, res) => {
  try {
    const { eventType, data } = req.body;
    
    console.log(`🔄 Processing internal product event: ${eventType}`);
    
    switch (eventType) {
      case 'ADD_PRODUCT_WITH_PHARMA':
        const mockReq = {
          body: {
            product: data.product,
            pharma: data.pharma
          }
        };
        await ProductController.addProductWithPharma(mockReq, res);
        break;
        
      case 'UPDATE_PRODUCT_WITH_PHARMA':
        const updateReq = {
          params: { id: data.productId },
          body: {
            product: data.product,
            pharma: data.pharma
          }
        };
        await ProductController.updateProductWithPharma(updateReq, res);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown product event type: ${eventType}`,
          data: null
        });
    }
    
  } catch (error) {
    console.error('❌ Internal product processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal processing error',
      error: error.message
    });
  }
});

// ===================================
// Member Internal Routes  
// ===================================
router.post('/member', validateInternalRequest, async (req, res) => {
  try {
    const { eventType, data } = req.body;
    
    console.log(`🔄 Processing internal member event: ${eventType}`);
    
    switch (eventType) {
      case 'ADD_MEMBER':
        // Generate password for external members
        if (!data.mem_password) {
          data.mem_password = generatePassword();
        }
        
        const mockReq = { body: data };
        await MemberController.addMember(mockReq, res);
        break;
        
      case 'UPDATE_MEMBER':
        const updateReq = {
          params: { id: data.memberId },
          body: data
        };
        await MemberController.updateMember(updateReq, res);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown member event type: ${eventType}`,
          data: null
        });
    }
    
  } catch (error) {
    console.error('❌ Internal member processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal processing error',
      error: error.message
    });
  }
});

// ===================================
// Sync Route (for data synchronization)
// ===================================
router.post('/sync', validateInternalRequest, (req, res) => {
  try {
    const { event, processedBy, timestamp } = req.body;
    
    console.log(`🔄 Data sync from ${processedBy}:`, {
      eventType: event.eventType,
      timestamp
    });
    
    // Log the sync for monitoring
    // TODO: Implement actual sync logic if needed
    
    return res.status(200).json({
      success: true,
      message: 'Sync acknowledged',
      data: {
        receivedAt: new Date().toISOString(),
        processedBy,
        eventType: event.eventType
      }
    });
    
  } catch (error) {
    console.error('❌ Sync error:', error);
    return res.status(500).json({
      success: false,
      message: 'Sync error',
      error: error.message
    });
  }
});

// ===================================
// Helper Functions
// ===================================
function generatePassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

module.exports = router;