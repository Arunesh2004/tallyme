# Provider Wiring Audit Report

## Implementation Strategy
To safely transition between the robust offline mocking suite required for development and the explicit physical boundaries required for `production`, a Factory Provider architecture (`useFactory`) was injected into `vendor-slip.module.ts`.

## Provider Switches Implemented

| Provider Token | Development Provider | Production Provider (`NODE_ENV=production`) | Switching Mechanism |
| -------------- | -------------------- | ------------------------------------------- | ------------------- |
| `OCRProvider` | `FakeOCRProvider` | `AzureOcrService` | NestJS `useFactory` + `ConfigService` |
| `AIExtractor` | `FakeInvoiceExtractionProvider` | `GeminiExtractionService` | NestJS `useFactory` + `ConfigService` |

## Runtime Verification
By relying exclusively on `process.env.NODE_ENV === 'production'`, the dependency injection container guarantees that local developers and unit tests will always hit the mock boundary, while the compiled production cluster will inherently instantiate the real cloud services. This complies entirely with the "Replace infrastructure boundaries only" mandate.
