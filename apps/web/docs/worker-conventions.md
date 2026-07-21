# Worker Conventions

## Naming
- Workers MUST be named with the `Worker` suffix (e.g., `SyncWorker`, `DocumentIntelligenceWorker`).
- Worker class names must clearly indicate the bounded context they belong to.

## Lifecycle & Shutdown Rules
- Workers implement the `IWorker` interface (`start`, `pause`, `resume`, `shutdown`).
- **Graceful Shutdown:** Workers MUST intercept `SIGTERM` and `SIGINT` signals. They must set their state to `SHUTTING_DOWN`, stop accepting new jobs from the queue, and wait for active jobs to complete (up to a timeout, e.g., 30s) before transitioning to `SHUTDOWN`.

## Error Handling & Retry Behavior
- Workers differentiate between transient and persistent failures using `WorkerError(message, isTransient)`.
- **Transient Errors:** (e.g., Rate limits, network timeouts). Rethrown to trigger the Queue adapter's configured exponential backoff.
- **Persistent Errors:** (e.g., Validation failures, malformed data). Rethrown but marked for immediate routing to the Dead Letter Queue (DLQ).

## Logging & Telemetry
- All workers MUST use the `BaseWorker` abstraction to ensure consistent telemetry.
- `BaseWorker` automatically records `TraceId`, `CorrelationId`, and exact execution duration (`durationMs`) on every job using the centralized Pino logger.

## Metrics & Health Checks
- Workers periodically update their `WorkerHealth` status (uptime, state, active jobs).
- The `WorkerManager` exposes these metrics via the `WorkerHealthService` for Kubernetes liveness/readiness probes.
