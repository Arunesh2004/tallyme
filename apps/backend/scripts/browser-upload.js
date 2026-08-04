const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const report = [];
  function logStep(step, status, detail = '') {
    const msg = `[${status}] ${step}${detail ? ` - ${detail}` : ''}`;
    console.log(msg);
    report.push(msg);
  }

  try {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`Failed Response: ${response.status()} - ${response.url()}`);
      }
    });

    // 1. Log in
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password');
    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);
    
    // Check if we reached the dashboard
    try {
      await page.waitForSelector('h1:has-text("Dashboard"), .lucide-home, .lucide-layout-dashboard', { timeout: 10000 });
      logStep('Login', 'PASS');
    } catch (e) {
      logStep('Login', 'FAIL', 'Dashboard did not load after login');
      await page.screenshot({ path: 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\f2002457-bc61-4f09-af56-fb88e9d8b807\\scratch\\login-fail.png' });
      process.exit(1);
    }

    // 2. Go to upload page
    await page.click('a[href="/upload/vendor"]');
    logStep('Navigate to /upload/vendor', 'PASS');

    // Wait for the upload page to fully load its real UI, not just the Loading spinner
    await page.waitForSelector('h1:has-text("Upload Vendor Invoice")', { timeout: 10000 });
    
    // Capture response to /api/v1/files/upload
    // We will just use the response returned by waitForResponse

    // 3. Upload file
    const filePath = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\f2002457-bc61-4f09-af56-fb88e9d8b807\\sample_vendor_invoice_1785504602968.png';
    await page.setInputFiles('input[type="file"]', filePath);
    logStep('Set file in input', 'PASS');

    // Click the upload button
    const uploadBtn = await page.waitForSelector('button:has-text("Upload Invoice")');
    await uploadBtn.click();
    logStep('Click upload button', 'PASS');

    // Wait for the upload response or for the success message in the DOM
    const uploadResponse = await page.waitForResponse(response => response.url().includes('/api/v1/files/upload') && response.request().method() === 'POST', { timeout: 30000 });
    const uploadStatus = uploadResponse.status();
    let uploadResponseBody = null;
    try {
      uploadResponseBody = await uploadResponse.json();
    } catch (e) {
      uploadResponseBody = await uploadResponse.text();
    }
    
    logStep('HTTP request status', uploadStatus === 201 ? 'PASS' : 'FAIL', uploadStatus);
    logStep('Response body', uploadStatus === 201 ? 'PASS' : 'FAIL', JSON.stringify(uploadResponseBody));

    if (uploadStatus !== 201) {
      throw new Error(`Upload failed with status ${uploadStatus}`);
    }

    const documentId = uploadResponseBody.fileId || uploadResponseBody.id;
    logStep('Document ID created', 'PASS', documentId);

    console.log('--- DB & BACKGROUND CHECK ---');
    console.log('DOC_ID:' + documentId);
    
    await browser.close();
  } catch (err) {
    console.error('Browser error:', err.message);
    await browser.close();
    process.exit(1);
  }
})();
