const http = require('http');

const port = process.env.PORT || 3000;
const containerRole = process.env.CONTAINER_ROLE || 'main';

const options = {
  hostname: 'localhost',
  port: port,
  path: '/health',  // ใช้ /health endpoint ที่มีอยู่แล้วใน server.js
  method: 'GET',
  timeout: 5000     // เพิ่ม timeout เป็น 5 วินาที
};

console.log(`🏥 Starting health check for ${containerRole} backend on port ${port}...`);

const healthCheck = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`🏥 Health check response (${res.statusCode}):`, data);
    
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        if (response.success && response.container === containerRole) {
          console.log(`✅ ${containerRole} backend is healthy`);
          process.exit(0); // Success
        } else {
          console.error(`❌ Health check failed: Invalid response structure`);
          process.exit(1); // Failure
        }
      } catch (parseError) {
        console.error(`❌ Health check failed: Invalid JSON response`);
        process.exit(1); // Failure
      }
    } else {
      console.error(`❌ Health check failed with status: ${res.statusCode}`);
      process.exit(1); // Failure
    }
  });
});

healthCheck.on('error', (err) => {
  console.error(`❌ ${containerRole} backend health check failed:`, err.message);
  process.exit(1); // Failure
});

healthCheck.on('timeout', () => {
  console.error(`⏰ ${containerRole} backend health check timed out`);
  healthCheck.destroy();
  process.exit(1); // Failure
});

healthCheck.setTimeout(5000);
healthCheck.end();