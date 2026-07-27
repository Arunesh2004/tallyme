import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initializeTracing() {
  // 1. Initialize OpenTelemetry
  try {
    const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
    const sdk = new NodeSDK({
      traceExporter: new ConsoleSpanExporter(),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
    console.log('OpenTelemetry initialized');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error));
    });
  } catch (e) {
    console.warn('OpenTelemetry could not be initialized completely', e);
  }

  // 2. Initialize Sentry
  if (process.env.SENTRY_DSN) {
    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [nodeProfilingIntegration()],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
      });
      console.log('Sentry initialized');
    } catch (e) {
      console.warn('Sentry initialization failed', e);
    }
  }
}
