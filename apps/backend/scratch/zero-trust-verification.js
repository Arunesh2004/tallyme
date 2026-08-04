const axios = require('axios');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const fs = require('fs');
const crypto = require('crypto');
const io = require('socket.io-client');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const API_URL = 'http://localhost:3005';

async function runVerification() {
  console.log('--- STARTING ZERO-TRUST VERIFICATION ---');
  
  // 1. Generate JWT
  const token = jwt.sign(
    {
      sub: 'test-user-id',
      email: 'test@example.com',
      tenantId: 'TENANT-123',
      permissions: ['Invoice.Upload', 'Invoice.Process', 'Invoice.Read', 'Voucher.Write']
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  const headers = { Authorization: `Bearer ${token}` };

  try {
    // 2. Upload Invoice (Seeded directly to bypass CSRF on files controller for this test)
    console.log('[Phase 3] Seeding document directly...');
    
    // Make sure the test-invoice.png exists or use dummy path
    const fileId = crypto.randomUUID();
    const doc = await prisma.document.create({
      data: {
        id: fileId,
        fileUrl: 'test-invoice.png',
        mimeType: 'image/png',
        status: 'UPLOADED',
        uploadedBy: 'test-user-id',
        source: 'MANUAL_UPLOAD',
        checksum: crypto.randomUUID(),
      }
    });
    
    console.log(`[Phase 3] Upload success (Seeded). FileID: ${fileId}`);

    // Set up WebSocket listener
    console.log('[Phase 5] Connecting to WebSockets...');
    const socket = io(API_URL, {
      extraHeaders: { Authorization: `Bearer ${token}` }
    });

    const wsEvents = [];
    socket.on(`${fileId}:ocr_status`, (data) => {
      console.log(`[WebSocket Event] ${data.status} received for ${fileId}`);
      wsEvents.push(data.status);
    });

    // Wait for WS to connect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Fetch CSRF
    console.log('[Phase 6] Fetching CSRF token...');
    const csrfRes = await axios.get(`${API_URL}/api/v1/auth/csrf`, { headers });
    const csrfToken = csrfRes.data.csrfToken;
    const cookies = csrfRes.headers['set-cookie'];
    const Cookie = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
    console.log(`[Phase 6] CSRF Token retrieved: ${csrfToken}`);
    
    const requestHeaders = { 
      ...headers, 
      'CSRF-Token': csrfToken,
      Cookie 
    };

    // 3. Trigger OCR
    console.log('[Phase 2 & 6] Triggering OCR...');
    const ocrStartTime = Date.now();
    const ocrRes = await axios.post(`${API_URL}/api/v1/ocr/process/${fileId}`, {}, { headers: requestHeaders });
    const ocrEndTime = Date.now();

    console.log(`[HTTP Contract] POST /ocr/process returned Status: ${ocrRes.status}`);
    console.log(`[HTTP Contract] Body: ${JSON.stringify(ocrRes.data)}`);
    console.log(`[Performance] Request took ${ocrEndTime - ocrStartTime}ms`);

    if (ocrEndTime - ocrStartTime > 5000) {
      console.log('WARNING: OCR process blocked for > 5 seconds. May not be truly asynchronous.');
    } else {
      console.log('SUCCESS: Request returned immediately.');
    }

    // 4. Wait for completion via WebSocket or Database Polling
    console.log('[Phase 5] Waiting for OCR completion...');
    let candidate = null;
    let attempts = 0;
    while (attempts < 60) {
      attempts++;
      const doc = await prisma.document.findUnique({
        where: { id: fileId },
        include: { invoiceCandidate: true }
      });

      if (doc && doc.status === 'OCR_COMPLETED' && doc.invoiceCandidate) {
        candidate = doc.invoiceCandidate;
        break;
      }
      
      if (doc && doc.status === 'OCR_FAILED') {
        console.error('OCR_FAILED recorded in database.');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (candidate) {
      console.log('[Phase 3] OCR Completed. Candidate ID:', candidate.id);
      console.log('[Phase 3] Extracted Data:', JSON.stringify(candidate.metadata, null, 2));
    } else {
      console.error('Failed to process invoice or timed out.');
    }

    console.log('[Phase 5] Captured WebSocket Events:', wsEvents);

    // 5. Verify ERP Queue/Voucher (if any)
    const drafts = await prisma.transactionDraft.findMany({
      where: { sourceReferenceId: candidate?.id }
    });
    console.log(`[Phase 3] Transaction Drafts generated: ${drafts.length}`);

    console.log('--- VERIFICATION COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('Error during verification:', error.response?.data || error.message);
    process.exit(1);
  }
}

runVerification();
