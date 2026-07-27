import { DateParserUtil } from './src/shared/utils/date-parser.util';

const testCases = [
  '2026-07-25',         // YYYY-MM-DD
  '25/07/2026',         // DD/MM/YYYY
  '25-07-2026',         // DD-MM-YYYY
  '2024-05-15T00:00:00Z', // ISO Date
  '31/02/2024',         // Impossible date
  'N/A',                // N/A
  '',                   // Empty string
  null,                 // null
  undefined,            // undefined
];

console.log('--- DateParserUtil Regression Tests ---');
for (const tc of testCases) {
  const result = DateParserUtil.parse(tc);
  console.log(`Input: ${tc === '' ? '""' : tc} \nOutput: ${result instanceof Date ? result.toISOString() : result}\n`);
}
