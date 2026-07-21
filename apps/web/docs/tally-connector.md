# Tally Connector Production Architecture

## Connection Flow
The Tally Connector resides in `shared/tally/` and serves as a pure infrastructural abstraction layer between the TallyMe Node.js runtime and the local Tally Prime ODBC/HTTP port.

1. **Client Request:** A caller invokes `TallyClient.getLedgers()`.
2. **DTO Generation:** The client passes the primitive string to `XmlBuilder` which uses `xmlbuilder2` to generate a strictly valid, escaped Tally `<ENVELOPE>`.
3. **Transport Execution:** `TallyTransport` executes a native Node `fetch()` POST request to the Tally URL with a strict `AbortController` timeout constraint.
4. **Parsing:** The raw string response is streamed into `XmlParser` where `fast-xml-parser` converts the `<ENVELOPE>` into a traversable JSON object.
5. **Validation:** The parser inspects `<LINEERROR>` tags and the `<STATUS>` header. If Tally rejected the request, an explicitly typed `TallyError` is thrown.
6. **Return:** The caller receives the DTO payload.

## XML Flow & Escaping
- Manual string concatenation is forbidden to prevent injection vulnerabilities (e.g., if a user types a `&` character in a Narration).
- `xmlbuilder2` is used exclusively.

## Retry Behaviour & Error Handling
Network requests are wrapped in `TallyTransport` which evaluates fetch failures:
- Uses a retry loop based on `TallyConfig` (default: 3 attempts).
- `TimeoutError`: Thrown when the `AbortController` interrupts a hanging request.
- `TallyUnavailableError`: Thrown on `ECONNREFUSED` or `fetch failed` when Tally is closed.
- `XmlParseError`: Thrown when Tally returns a malformed response or a `<LINEERROR>`.

## Example Integration
```typescript
import { TallyClient } from '@/shared/tally/TallyClient';
import { TallyTransport } from '@/shared/tally/TallyTransport';
import { defaultConfig } from '@/shared/tally/config/TallyConfig';
import { TallyVoucher } from '@/shared/tally/types/TallyDTOs';

// Setup
const transport = new TallyTransport(defaultConfig);
const client = new TallyClient(transport);

// Create Voucher
const voucher: TallyVoucher = {
  date: '20230401',
  voucherType: 'Receipt',
  narration: 'Fee Collection',
  ledgers: [
    { ledgerName: 'Cash', amount: '-500', isDeemedPositive: false },
    { ledgerName: 'Student Fees', amount: '500', isDeemedPositive: true }
  ]
};

try {
  const result = await client.createVoucher(voucher);
  console.log('Success:', result);
} catch (error) {
  if (error instanceof XmlParseError) {
    console.error('Tally rejected the XML:', error.message);
  }
}
```
