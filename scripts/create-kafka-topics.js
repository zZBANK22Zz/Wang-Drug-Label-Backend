const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'topic-creator',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const admin = kafka.admin();

const topics = [
  {
    topic: 'product-events',
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '604800000' } // 7 days
    ]
  },
  {
    topic: 'member-events',
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '604800000' } // 7 days
    ]
  },
  {
    topic: 'prescription-events',
    numPartitions: 2,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '1209600000' } // 14 days
    ]
  },
  {
    topic: 'pharma-events',
    numPartitions: 2,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '604800000' } // 7 days
    ]
  },
  {
    topic: 'dead-letter-queue',
    numPartitions: 1,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '2592000000' } // 30 days
    ]
  },
  {
    topic: 'product-retry',
    numPartitions: 1,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '86400000' } // 1 day
    ]
  },
  {
    topic: 'member-retry',
    numPartitions: 1,
    replicationFactor: 1,
    configEntries: [
      { name: 'cleanup.policy', value: 'delete' },
      { name: 'retention.ms', value: '86400000' } // 1 day
    ]
  }
];

async function createTopics() {
  try {
    console.log('🔌 Connecting to Kafka admin...');
    await admin.connect();

    console.log('📋 Listing existing topics...');
    const existingTopics = await admin.listTopics();
    console.log('Existing topics:', existingTopics);

    console.log('🆕 Creating new topics...');
    const topicsToCreate = topics.filter(topic => !existingTopics.includes(topic.topic));

    if (topicsToCreate.length === 0) {
      console.log('✅ All topics already exist');
      return;
    }

    const result = await admin.createTopics({
      topics: topicsToCreate
    });

    if (result) {
      console.log('✅ Topics created successfully:');
      topicsToCreate.forEach(topic => {
        console.log(`  - ${topic.topic} (${topic.numPartitions} partitions)`);
      });
    } else {
      console.log('⚠️ Some topics may already exist');
    }

    console.log('📊 Final topic list:');
    const finalTopics = await admin.listTopics();
    finalTopics.forEach(topic => console.log(`  - ${topic}`));

  } catch (error) {
    console.error('❌ Error creating topics:', error);
  } finally {
    await admin.disconnect();
  }
}

// Check Kafka Health Script
async function checkKafkaHealth() {
  try {
    console.log('🔍 Checking Kafka health...');
    await admin.connect();
    
    const metadata = await admin.fetchTopicMetadata();
    console.log('✅ Kafka is healthy');
    console.log('📊 Cluster info:', {
      brokers: metadata.brokers.length,
      topics: metadata.topics.length
    });
    
    return true;
  } catch (error) {
    console.error('❌ Kafka health check failed:', error.message);
    return false;
  } finally {
    await admin.disconnect();
  }
}

// Run based on script name
if (require.main === module) {
  const script = process.argv[2];
  
  if (script === 'health') {
    checkKafkaHealth().then(healthy => {
      process.exit(healthy ? 0 : 1);
    });
  } else {
    createTopics().then(() => {
      console.log('🏁 Script completed');
      process.exit(0);
    });
  }
}

module.exports = { createTopics, checkKafkaHealth };