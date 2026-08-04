import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const draftCreationLatency = new Trend('draft_creation_duration');
const draftApprovalLatency = new Trend('draft_approval_duration');
const errorRate = new Rate('errors');
const successCount = new Counter('successful_transactions');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 virtual users
    { duration: '1m', target: 20 },  // Hold at 20 virtual users
    { duration: '30s', target: 50 }, // Spike to 50 virtual users
    { duration: '2m', target: 50 },  // Hold at 50 virtual users
    { duration: '30s', target: 0 },  // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    draft_creation_duration: ['p(95)<200'],
    draft_approval_duration: ['p(95)<300'],
    errors: ['rate<0.01'], // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v2';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };

  // 1. Create a Transaction Draft
  const draftPayload = JSON.stringify({
    type: 'VENDOR_PAYMENT',
    amount: Math.floor(Math.random() * 1000) + 1,
    currency: 'INR',
    metadata: {
      vendorId: 'VEND-' + Math.floor(Math.random() * 1000),
      invoiceNumber: 'INV-' + Date.now(),
    },
  });

  const createRes = http.post(`${BASE_URL}/transactions/drafts`, draftPayload, { headers });
  
  draftCreationLatency.add(createRes.timings.duration);
  
  const createSuccess = check(createRes, {
    'draft created status 201': (r) => r.status === 201,
    'has draft id': (r) => r.json('id') !== undefined,
  });

  if (!createSuccess) {
    errorRate.add(1);
    return; // Stop if creation fails
  }

  const draftId = createRes.json('id');
  
  // Wait a short bit before approval to simulate user think time
  sleep(1);

  // 2. Approve the Draft
  const approvalPayload = JSON.stringify({
    approved: true,
    notes: 'Load test approval',
  });

  const approveRes = http.post(`${BASE_URL}/transactions/drafts/${draftId}/approve`, approvalPayload, { headers });
  
  draftApprovalLatency.add(approveRes.timings.duration);

  const approveSuccess = check(approveRes, {
    'draft approved status 200': (r) => r.status === 200,
    'status is QUEUED': (r) => r.json('status') === 'QUEUED',
  });

  if (approveSuccess) {
    successCount.add(1);
  } else {
    errorRate.add(1);
  }

  // Pace the requests
  sleep(1);
}
