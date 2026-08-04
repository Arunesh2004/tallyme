const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

async function run() {
  try {
    console.log("Fetching CSRF token...");
    const csrfRes = await client.get('http://localhost:3001/api/v1/auth/csrf');
    const csrfToken = csrfRes.data.csrfToken;
    console.log("CSRF Token:", csrfToken);
    
    console.log("Attempting Login...");
    const loginRes = await client.post('http://localhost:3001/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'password'
    }, {
      headers: { 'X-CSRF-Token': csrfToken }
    });
    console.log("Login Status:", loginRes.status);
    
    // The backend uses JWT in cookies or response. Let's see if login works.
    console.log("Uploading file...");
    const filePath = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\f2002457-bc61-4f09-af56-fb88e9d8b807\\sample_vendor_invoice_1785504602968.png';
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    const uploadRes = await client.post('http://localhost:3001/api/v1/files/upload', form, {
      headers: {
        ...form.getHeaders(),
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${loginRes.data.accessToken}`
      }
    });
    
    console.log("Upload Success:", uploadRes.status, uploadRes.data);
    
    console.log("Triggering OCR pipeline...");
    const ocrRes = await client.post(`http://localhost:3001/api/v1/ocr/process/${uploadRes.data.fileId}`, {}, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${loginRes.data.accessToken}`
      }
    });
    console.log("OCR Success:", ocrRes.status, ocrRes.data);
  } catch (error) {
    if (error.response) {
      console.log("Error Response:", error.response.status, error.response.data);
    } else {
      console.log("Error:", error.message);
    }
  }
}

run();
