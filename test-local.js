// Test server for local development
require('dotenv').config();
const app = require('./api/index');

const PORT = process.env.PORT || 3000;

// Only for local testing - Vercel handles this differently
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✨ Test server running on http://localhost:${PORT}`);
    console.log(`📝 API Health: http://localhost:${PORT}/api`);
    console.log(`🔑 Remember to set your environment variables!`);
  });
}

// Test endpoints
console.log('\n📍 Available Endpoints:');
console.log('GET  /api - Health check');
console.log('GET  /api/check-access?email=user@example.com');
console.log('POST /api/stripe/create-checkout-session');
console.log('POST /api/stripe/create-portal-session');
console.log('GET  /api/airtable/users');
console.log('GET  /api/airtable/analytics');
console.log('\n');
