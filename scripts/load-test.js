/**
 * TallyMe Enterprise — Production Load Test
 * Tool: k6 (https://k6.io)
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:3000 load-test.js
 *   k6 run --env BASE_URL=https://staging.tallyme.com load-test.js --out json=results.json
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ---- Custom Metrics ---------------------------------------------------------
const errorRate = new Rate('error_rate');
const apiLatency = new Trend('api_latency', true);
const automationRequests = new Counter('automation_requests_total');

// ---- Configuration ----------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API = `${BASE_URL}/api/v1`;

export const options = {
  scenarios: {
    // Stage 1: 100 concurrent users (baseline)
    baseline_100:  {
      executor: 'constant-vus',
      vus: 100,
      duration: '2m',
      tags: { scenario: 'baseline_100' },
    },
    // Stage 2: 500 concurrent users (stress)
    stress_500: {
      executor: 'constant-vus',
      vus: 500,
      duration: '2m',
      startTime: '2m30s',
      tags: { scenario: 'stress_500' },
    },
    // Stage 3: 1000 concurrent users (peak)
    peak_1000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 },
        { duration: '2m', target: 1000 },
        { duration: '1m', target: 0 },
      ],
      startTime: '5m',
      tags: { scenario: 'peak_1000' },
    },
    // Stage 4: Large student email batches
    student_batch: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 100,
      startTime: '9m',
      tags: { scenario: 'student_batch' },
    },
  },
  thresholds: {
    // 95% of requests must complete below 500ms
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    // Error rate must stay below 1%
    error_rate: ['rate<0.01'],
    // Health checks must always be fast
    'http_req_duration{endpoint:health}': ['p(99)<100'],
  },
};

// ---- Test Scenarios ---------------------------------------------------------

export default function () {
  const scenario = __ENV.K6_SCENARIO_NAME || 'default';

  // 60% — Health checks (simulates K8s probes + monitoring)
  if (Math.random() < 0.60) {
    healthCheck();
  }
  // 20% — Student Fee Automation trigger
  else if (Math.random() < 0.80) {
    studentFeeAutomation();
  }
  // 20% — Vendor Slip Automation trigger
  else {
    vendorSlipAutomation();
  }

  sleep(1);
}

function healthCheck() {
  const res = http.get(`${API}/health/live`, {
    tags: { endpoint: 'health' },
  });
  const ok = check(res, {
    'health live is 200': (r) => r.status === 200,
  });
  errorRate.add(!ok);
  apiLatency.add(res.timings.duration, { endpoint: 'health' });
}

function studentFeeAutomation() {
  const payload = JSON.stringify({
    emailId: `load-test-email-${__VU}-${__ITER}`,
  });
  const res = http.post(`${API}/mail/parse`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'student-automation' },
  });
  const ok = check(res, {
    'student automation accepted': (r) => r.status >= 200 && r.status < 500,
  });
  errorRate.add(!ok);
  automationRequests.add(1, { workflow: 'student' });
  apiLatency.add(res.timings.duration, { endpoint: 'student-automation' });
}

function vendorSlipAutomation() {
  const payload = JSON.stringify({
    emailId: `vendor-load-test-${__VU}-${__ITER}`,
  });
  const res = http.post(`${API}/payment-parser/process`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'vendor-automation' },
  });
  const ok = check(res, {
    'vendor automation accepted': (r) => r.status >= 200 && r.status < 500,
  });
  errorRate.add(!ok);
  automationRequests.add(1, { workflow: 'vendor' });
  apiLatency.add(res.timings.duration, { endpoint: 'vendor-automation' });
}
