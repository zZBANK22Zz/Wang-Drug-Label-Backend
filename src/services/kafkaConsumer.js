// ===================================
// src/services/kafkaConsumer.js (SIMPLE ACTIVE-PASSIVE)
// ===================================
const { connectKafka, subscribeToTopics } = require('../config/kafka');
const KafkaMessageHandler = require('./kafkaHandlers');

class KafkaConsumer {
  constructor() {
    this.handler = new KafkaMessageHandler();
    
    // อ่าน topics จาก environment variable
    const envTopics = process.env.KAFKA_TOPICS;
    if (envTopics) {
      this.topics = envTopics.split(',').map(topic => topic.trim());
    } else {
      this.topics = [
        'product-events',
        'member-events', 
        'prescription-events',
        'pharma-events'
      ];
    }
    
    this.containerRole = process.env.CONTAINER_ROLE || 'main';
    this.isStandby = this.containerRole === 'main'; // main starts as standby
    
    console.log(`🎯 ${this.containerRole} Backend will listen to topics:`, this.topics);
    console.log(`📊 Role: ${this.containerRole === 'secondary' ? 'PRIMARY PROCESSOR' : 'STANDBY PROCESSOR'}`);
  }

  async startConsumer() {
    try {
      console.log(`🔌 Starting Kafka consumer for ${this.containerRole} backend...`);
      
      // Connect to Kafka
      await connectKafka();
      console.log(`✅ ${this.containerRole} Backend: Kafka connected successfully`);
      
      if (this.containerRole === 'secondary') {
        // 🎯 SECONDARY: Primary processor - start immediately
        await this.startPrimaryProcessor();
      } else {
        // 🕰️ MAIN: Standby processor - ready for failover
        await this.startStandbyProcessor();
      }
      
    } catch (error) {
      console.error(`❌ ${this.containerRole} Backend Kafka consumer error:`, error);
      setTimeout(() => {
        console.log(`🔄 Retrying Kafka connection in 5 seconds...`);
        this.startConsumer();
      }, 5000);
    }
  }

  // ===================================
  // 🎯 PRIMARY PROCESSOR (Secondary Backend)
  // ===================================
  async startPrimaryProcessor() {
    console.log(`🎯 ${this.containerRole} Backend starting as PRIMARY processor...`);
    console.log(`📡 Subscribing to topics immediately:`, this.topics);
    
    // Subscribe to topics ทันที
    await subscribeToTopics(this.topics, async (message) => {
      try {
        console.log(`📥 ${this.containerRole} Backend (PRIMARY) received message:`, {
          topic: message.topic,
          eventType: message.value?.eventType,
          source: message.value?.source,
          key: message.key,
          partition: message.partition,
          offset: message.offset
        });
        
        await this.handler.processMessage(message);
        console.log(`✅ ${this.containerRole} Backend (PRIMARY) processed message successfully`);
        
      } catch (error) {
        console.error(`❌ ${this.containerRole} Backend (PRIMARY) message processing failed:`, error);
        throw error;
      }
    });
    
    console.log(`🚀 ${this.containerRole} Backend is now ACTIVE as PRIMARY processor`);
  }

  // ===================================
  // 🕰️ STANDBY PROCESSOR (Main Backend) - TRUE PASSIVE
  // ===================================
  async startStandbyProcessor() {
    console.log(`🕰️ ${this.containerRole} Backend starting as TRUE STANDBY...`);
    console.log(`⏸️ Will NOT consume messages unless secondary fails`);
    
    // 🛑 DON'T SUBSCRIBE - จะ subscribe เฉพาะเมื่อ secondary ล่ม
    console.log(`🔍 Monitoring secondary backend health...`);
    
    // เริ่ม health monitoring แต่ไม่ subscribe
    this.startHealthMonitoring();
  }

  // ===================================
  // 🔍 HEALTH MONITORING - PASSIVE MODE
  // ===================================
  startHealthMonitoring() {
    const secondaryUrl = process.env.SECOND_BACKEND_URL || 'http://second-backend:3001';
    let failureCount = 0;
    const maxFailures = 3;
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const response = await require('axios').get(`${secondaryUrl}/health`, {
          timeout: 5000
        });
        
        if (response.status === 200) {
          // Secondary ยังทำงานอยู่
          failureCount = 0;
          
          if (this.isActive) {
            console.log(`✅ Secondary backend recovered! Deactivating main backend...`);
            // TODO: ในการใช้งานจริง อาจต้อง restart consumer
            this.isActive = false;
          }
        }
        
      } catch (error) {
        failureCount++;
        console.log(`⚠️ Secondary health check failed (${failureCount}/${maxFailures})`);
        
        if (failureCount >= maxFailures && !this.isActive) {
          console.log(`🚨 Secondary backend is DOWN! Activating main backend...`);
          await this.activateFailover();
        }
      }
    }, 10000); // ตรวจทุก 10 วินาที
  }

  // ===================================
  // 🔄 ACTIVATE FAILOVER
  // ===================================
  async activateFailover() {
    if (this.isActive) return;
    
    try {
      console.log(`🔄 FAILOVER ACTIVATED: ${this.containerRole} Backend taking over...`);
      
      // ตอนนี้ค่อย subscribe to topics
      await subscribeToTopics(this.topics, async (message) => {
        try {
          console.log(`🚨 ${this.containerRole} Backend (EMERGENCY) received message:`, {
            topic: message.topic,
            eventType: message.value?.eventType,
            source: message.value?.source,
            key: message.key,
            partition: message.partition,
            offset: message.offset,
            status: '🔴 EMERGENCY FAILOVER - Secondary is DOWN'
          });
          
          await this.handler.processMessage(message);
          console.log(`✅ ${this.containerRole} Backend (EMERGENCY) processed message successfully`);
          
        } catch (error) {
          console.error(`❌ ${this.containerRole} Backend (EMERGENCY) message processing failed:`, error);
          throw error;
        }
      });
      
      this.isActive = true;
      console.log(`🚀 ${this.containerRole} Backend is now ACTIVE (EMERGENCY FAILOVER)`);
      
    } catch (error) {
      console.error(`❌ Failed to activate emergency failover:`, error);
    }
  }

  async stopConsumer() {
    try {
      console.log(`🛑 Stopping ${this.containerRole} Backend Kafka consumer...`);
      // Add disconnect logic here if needed
    } catch (error) {
      console.error(`❌ Error stopping ${this.containerRole} Backend consumer:`, error);
    }
  }
}

module.exports = KafkaConsumer;