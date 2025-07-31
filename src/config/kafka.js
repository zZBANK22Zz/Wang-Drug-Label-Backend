// ===================================
// src/config/kafka.js (Updated with Priority - Fixed)
// ===================================
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: `drug-label-${process.env.CONTAINER_ROLE || 'main'}`,
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000
});

// 🆕 Consumer with Priority Settings (Fixed)
const createConsumer = () => {
  const containerRole = process.env.CONTAINER_ROLE || 'main';
  const consumerGroup = process.env.KAFKA_CONSUMER_GROUP || 'primary-processors';
  
  // 🎯 Priority configuration based on container role
  const consumerConfig = {
    groupId: consumerGroup,
    // Secondary backend gets priority
    sessionTimeout: containerRole === 'secondary' ? 6000 : 30000,     // Shorter timeout for secondary
    heartbeatInterval: containerRole === 'secondary' ? 1000 : 3000,   // More frequent heartbeat for secondary
    maxWaitTimeInMs: containerRole === 'secondary' ? 100 : 1000,      // Faster processing for secondary
    allowAutoTopicCreation: true
    // ❌ Removed custom partitionAssigners as it was causing the error
    // We'll use other methods for priority handling
  };

  console.log(`🔧 Creating ${containerRole} consumer with config:`, {
    groupId: consumerConfig.groupId,
    sessionTimeout: consumerConfig.sessionTimeout,
    heartbeatInterval: consumerConfig.heartbeatInterval,
    priority: containerRole === 'secondary' ? 'HIGH' : 'LOW'
  });

  return kafka.consumer(consumerConfig);
};

const consumer = createConsumer();

// Rest of kafka.js remains the same...
const connectKafka = async () => {
  try {
    console.log('🔌 Connecting to Kafka...');
    await producer.connect();
    await consumer.connect();
    console.log('✅ Kafka connected successfully');
  } catch (error) {
    console.error('❌ Kafka connection error:', error);
    throw error;
  }
};

const disconnectKafka = async () => {
  try {
    await producer.disconnect();
    await consumer.disconnect();
    console.log('✅ Kafka disconnected successfully');
  } catch (error) {
    console.error('❌ Kafka disconnect error:', error);
  }
};

// Producer functions remain the same...
const publishMessage = async (topic, message, key = null) => {
  try {
    const messageValue = typeof message === 'string' ? message : JSON.stringify(message);
    
    const result = await producer.send({
      topic,
      messages: [{
        key: key,
        value: messageValue,
        timestamp: Date.now(),
        headers: {
          source: process.env.CONTAINER_ROLE || 'unknown',
          version: '1.0'
        }
      }]
    });
    
    console.log('📤 Message published:', { 
      topic, 
      key, 
      partition: result[0].partition,
      offset: result[0].baseOffset 
    });
    return result;
  } catch (error) {
    console.error('❌ Failed to publish message:', error);
    throw error;
  }
};

// 🆕 Improved subscribe with priority handling
const subscribeToTopics = async (topics, messageHandler) => {
  try {
    const containerRole = process.env.CONTAINER_ROLE || 'main';
    
    // ✅ Add validation for topics parameter
    if (!topics || !Array.isArray(topics)) {
      throw new Error('Topics must be a non-empty array');
    }

    for (const topic of topics) {
      await consumer.subscribe({ 
        topic: topic.trim(), 
        fromBeginning: false 
      });
    }

    // 🎯 Add delay for main backend to ensure secondary gets priority
    if (containerRole === 'main') {
      console.log('⏳ Main backend waiting 10 seconds to ensure secondary priority...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const parsedMessage = {
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString(),
            value: JSON.parse(message.value.toString()),
            timestamp: message.timestamp,
            headers: message.headers ? Object.fromEntries(
              Object.entries(message.headers).map(([k, v]) => [k, v.toString()])
            ) : {}
          };
          
          console.log('📥 Message received:', {
            topic,
            key: parsedMessage.key,
            offset: message.offset,
            partition,
            container: containerRole,
            priority: containerRole === 'secondary' ? 'PRIMARY' : 'BACKUP'
          });

          await messageHandler(parsedMessage);
        } catch (error) {
          console.error('❌ Error processing message:', error);
          await handleFailedMessage(topic, message, error);
        }
      }
    });
    
    console.log(`✅ ${containerRole} backend subscribed to topics:`, topics);
    console.log(`🎯 Consumer priority: ${containerRole === 'secondary' ? 'PRIMARY' : 'BACKUP'}`);
  } catch (error) {
    console.error('❌ Failed to subscribe to topics:', error);
    throw error;
  }
};

// Dead letter queue handler remains the same...
const handleFailedMessage = async (topic, message, error) => {
  try {
    console.error('💥 Message processing failed:', {
      topic,
      key: message.key?.toString(),
      offset: message.offset,
      error: error.message,
      container: process.env.CONTAINER_ROLE
    });

    await publishMessage('dead-letter-queue', {
      originalTopic: topic,
      originalMessage: {
        key: message.key?.toString(),
        value: message.value.toString(),
        offset: message.offset,
        partition: message.partition
      },
      error: error.message,
      timestamp: Date.now(),
      containerRole: process.env.CONTAINER_ROLE
    });
  } catch (dlqError) {
    console.error('❌ Failed to send to dead letter queue:', dlqError);
  }
};

// Health check remains the same...
const checkKafkaHealth = async () => {
  try {
    const admin = kafka.admin();
    await admin.connect();
    await admin.listTopics();
    await admin.disconnect();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
};

module.exports = {
  kafka,
  producer,
  consumer,
  connectKafka,
  disconnectKafka,
  publishMessage,
  subscribeToTopics,
  checkKafkaHealth
};