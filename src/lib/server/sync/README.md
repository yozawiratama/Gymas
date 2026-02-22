# Sync

Sync and outbox logic live here.

Notes
- Server ingest records rejected events (when an idempotency key is present) to keep retries deterministic.
- Clients may safely retry the full /sync/push batch; ingest is idempotent via ProcessedEvent uniqueness.
