const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 5000,
  method: 'GET'
};

const request = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const healthData = JSON.parse(data);
      
      console.log(`Health check status: ${res.statusCode}`);
      console.log(`Container: ${healthData.container || 'unknown'}`);
      console.log(`Services: ${JSON.stringify(healthData.services || {})}`);
      
      if (res.statusCode === 200 && healthData.success) {
        console.log('✅ Health check passed');
        process.exit(0);
      } else {
        console.log('❌ Health check failed - unhealthy response');
        process.exit(1);
      }
    } catch (error) {
      console.log('❌ Health check failed - invalid JSON response');
      process.exit(1);
    }
  });
});

request.on('error', (err) => {
  console.log('❌ Health check failed:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('❌ Health check timeout');
  request.destroy();
  process.exit(1);
});

request.end();