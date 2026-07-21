# Event Architecture Conventions

## Naming
- Events MUST be named in the past tense representing a completed action (e.g., `UserAuthenticated`, `DocumentUploaded`).
- Events MUST NOT be named as commands (e.g., `UploadDocument`).

## Versioning
- All events include a `version` integer (starting at `1`).
- Breaking schema changes to an event require a new version number. Consumers must be backward-compatible with previous versions during migrations.

## Metadata & Telemetry
- Every event MUST carry `TraceId` and `CorrelationId` in the `EventMetadata` to enable distributed tracing. 

## Publishing Rules (Outbox Pattern)
- Direct publishing to external message brokers (e.g., RabbitMQ, BullMQ) during an API request is FORBIDDEN.
- Events must be published via the `OutboxPublisher`, which persists the `EventEnvelope` to the PostgreSQL `EventOutbox` table atomically within the business transaction.

## Subscriber Rules & Idempotency
- Subscribers MUST assume events can be delivered more than once (At-Least-Once delivery).
- Subscribers MUST implement idempotency checks using the `eventId` to prevent processing the same event multiple times.

## Failure Handling
- Unhandled exceptions in subscribers trigger automatic retries.
- After a configurable threshold (e.g., 5 retries), the event is moved to the `FailedEvent` repository (Dead Letter Queue) for manual intervention.
