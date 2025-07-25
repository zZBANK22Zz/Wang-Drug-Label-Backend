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

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_CONSUMER_GROUP || 'default-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

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

// Producer functions
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

// Consumer functions
const subscribeToTopics = async (topics, messageHandler) => {
  try {
    for (const topic of topics) {
      await consumer.subscribe({ topic: topic.trim(), fromBeginning: false });
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
            container: process.env.CONTAINER_ROLE
          });

          await messageHandler(parsedMessage);
        } catch (error) {
          console.error('❌ Error processing message:', error);
          // TODO: Implement dead letter queue logic here if needed
          await handleFailedMessage(topic, message, error);
        }
      }
    });
    
    console.log('✅ Subscribed to topics:', topics);
  } catch (error) {
    console.error('❌ Failed to subscribe to topics:', error);
    throw error;
  }
};

// Dead letter queue handler
const handleFailedMessage = async (topic, message, error) => {
  try {
    console.error('💥 Message processing failed:', {
      topic,
      key: message.key?.toString(),
      offset: message.offset,
      error: error.message,
      container: process.env.CONTAINER_ROLE
    });

    // Send to dead letter queue
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

// Health check for Kafka
const checkKafkaHealth = async () => {
  try {
    // Try to get metadata from Kafka
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