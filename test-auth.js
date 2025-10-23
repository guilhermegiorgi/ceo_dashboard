// Test script to check authentication
const token = process.argv[2];

if (!token) {
  console.log('Usage: node test-auth.js <YOUR_TOKEN>');
  console.log('\nTo get your token:');
  console.log('1. Open DevTools (F12)');
  console.log('2. Go to Console tab');
  console.log('3. Run: localStorage.getItem("token")');
  process.exit(1);
}

fetch('http://localhost:3002/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Response:', JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('❌ Error:', err.message);
});
