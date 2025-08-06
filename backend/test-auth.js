// Quick test to debug authentication
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Test 1: Check if we can decode a token manually
console.log('🔍 Testing JWT Authentication...\n');

// You can get a token by making a login request and paste it here
const sampleToken = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

if (sampleToken !== 'YOUR_JWT_TOKEN_HERE') {
  try {
    const publicKey = fs.readFileSync('./keys/jwt-public.pem', 'utf8');
    const decoded = jwt.verify(sampleToken, publicKey, { algorithms: ['RS256'] });
    
    console.log('✅ Token decoded successfully:');
    console.log('📋 Payload:', JSON.stringify(decoded, null, 2));
    console.log('🔑 isSuperadmin:', decoded.isSuperadmin);
    console.log('👥 roleIds:', decoded.roleIds);
  } catch (error) {
    console.log('❌ Token decode failed:', error.message);
  }
} else {
  console.log('ℹ️  Please get a JWT token first and replace sampleToken');
}

// Test 2: Check superadmin credentials from seed
console.log('\n📧 Seeded superadmin credentials:');
console.log('Email: superadmin@erp.com');
console.log('Password: Superadmin123! (with exclamation mark)');
console.log('\n⚠️  Make sure you are using the correct password!');