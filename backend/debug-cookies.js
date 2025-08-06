// Debug cookie authentication
const axios = require('axios');

async function testCookieAuth() {
  try {
    console.log('🔍 Testing Cookie Authentication...\n');
    
    // Step 1: Login and get cookies
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:8080/auth/login', {
      email: 'superadmin@erp.com',
      password: 'Superadmin123'
    }, {
      withCredentials: true  // Important for cookies
    });
    
    console.log('✅ Login successful');
    console.log('📋 Response headers:', loginResponse.headers);
    console.log('🍪 Set-Cookie headers:', loginResponse.headers['set-cookie']);
    
    // Step 2: Extract cookies
    const cookies = loginResponse.headers['set-cookie'];
    if (!cookies) {
      console.log('❌ No cookies set in response');
      return;
    }
    
    // Step 3: Use cookies for protected request
    console.log('\n2. Testing protected route with cookies...');
    const cookieHeader = cookies.join('; ');
    
    const protectedResponse = await axios.get('http://localhost:8080/superadmin/companies', {
      headers: {
        'Cookie': cookieHeader
      },
      withCredentials: true
    });
    
    console.log('✅ Protected route accessed successfully with cookies');
    console.log('📊 Companies:', protectedResponse.data);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.statusText);
    console.log('📝 Error details:', error.response?.data);
  }
}

testCookieAuth();