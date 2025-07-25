const { checkKafkaHealth } = require('../src/config/kafka');

async function main() {
  try {
    console.log('🔍 Checking Kafka connectivity...');
    
    const healthStatus = await checkKafkaHealth();
    
    if (healthStatus.status === 'healthy') {
      console.log('✅ Kafka is healthy and reachable');
      console.log('📊 Status:', healthStatus);
      process.exit(0);
    } else {
      console.error('❌ Kafka is unhealthy');
      console.error('📊 Status:', healthStatus);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Health check failed:', error.message);
    process.exit(1);
  }
}

main();