# Queue Architecture Conventions

## Naming
- Queues MUST be named dynamically using the tenant ID to support isolated processing streams if required, or logically by domain (e.g., `document-intelligence-queue`).

## Retry Policy
- All asynchronous jobs MUST define a `RetryPolicy`.
- Transient errors (e.g., Tally network timeout, LLM API rate limit) should use `exponential` backoff.
- The maximum retry attempt limit should strictly not exceed 5 to prevent infinite loops in the Dead Letter Queue.

## Timeout Rules
- Jobs MUST define a strict `timeout` (e.g., 5 minutes for OCR). If the timeout is reached, the job is forcibly marked as failed and routed according to the RetryPolicy.

## Dead Letter Queue (DLQ) Conventions
- If a job exhausts its `RetryPolicy` attempts, it is automatically moved to the DLQ state by the BullMQ adapter.
- The `FailedEventRepository` (defined in Event Infrastructure) is used alongside the `JobRepository` to track the lifecycle of the failure and allow manual inspection by IT administrators.

## Idempotency Expectations
- The Queue system guarantees *At-Least-Once* delivery.
- Job handlers MUST be designed idempotently. Running the exact same job twice must not result in duplicate API calls or duplicate database inserts. Rely on the `IJob.id` (or `EventId` if triggered by an event) as the idempotency key.
