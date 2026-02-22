# Gymas

SvelteKit + TypeScript application backed by MySQL via Prisma.
Phase 0 focuses on clean foundations and dependency hygiene.

## Stack

- SvelteKit (adapter-node)
- TailwindCSS + daisyUI
- Prisma (MySQL)
- Lucia is not introduced unless already integrated

Drizzle is not used in this repository.

## Developing

Install dependencies, then start the dev server:

```sh
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` (MySQL)
- `SHADOW_DATABASE_URL` (required for `prisma migrate dev`)
- `DEVICE_ID`
- `GYM_ID`
- Optional: `APP_ENV`, `NODE_ENV`

## Health Check

`GET /health` returns a lightweight JSON status (`ok`, `env`, `version`, `time`) without touching the DB.
`GET /health/db` performs a minimal DB ping only when `HEALTH_DB_ENABLED=true`.

## Database Migration

Apply schema changes (MySQL):

```sh
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
```

## Deployment

See `DEPLOYMENT.md` for production environment variables, logging, and operational notes.

## Operations

- `DEPLOYMENT.md`
- `RUNBOOK.md`
- `BACKUP_RESTORE.md`
- `RELEASE_CHECKLIST.md`

## Attendance Check-In

1. Start the app: `npm run dev`
2. Visit `/attendance/check-in`
3. Select a member (or enter a member code) and submit
4. The page shows the created attendance record and the pending outbox count

## Outbox Debug

Visit `/debug/outbox` to see the latest 50 outbox events and pending/failed counts.

## Server Sync Push (POST /sync/push)

The server ingest endpoint accepts outbox events and applies them to MySQL with idempotency.

Auth
- Requires an authenticated staff/admin session (cookie-based). Anonymous access is rejected.

Request (JSON)
```json
{
  "deviceId": "device-123",
  "gymId": "gym-001",
  "events": [
    {
      "id": "outbox-event-id",
      "type": "ATTENDANCE_CHECKIN",
      "payload": {
        "attendanceId": "attendance-id",
        "memberId": "member-id",
        "checkinAt": "2026-02-06T12:34:56.000Z",
        "checkinDate": "2026-02-06",
        "snapshots": {
          "member": {
            "id": "member-id",
            "memberCode": "M-0001",
            "firstName": "Ada",
            "lastName": "Lovelace",
            "email": "ada@example.com",
            "phone": "+1-555-0100",
            "status": "ACTIVE"
          }
        },
        "deviceId": "device-123",
        "gymId": "gym-001"
      },
      "idempotencyKey": "attendance-checkin:attendance-id",
      "createdAt": "2026-02-06T12:34:56.000Z"
    }
  ]
}
```

Response (JSON)
```json
{
  "acked": ["outbox-event-id"],
  "rejected": [
    {
      "eventId": "outbox-event-id",
      "reasonCode": "MEMBER_NOT_FOUND",
      "message": "Member not found."
    }
  ],
  "alreadyProcessed": ["outbox-event-id"]
}
```

Supported event types
- `ATTENDANCE_CHECKIN` only. Any other event type is rejected with `UNSUPPORTED_EVENT_TYPE`.

## Processed Events Debug

Visit `/debug/processed-events` (admin-only) to see the last 50 processed events.

## Idempotency Test (Manual)

1. POST a valid batch to `/sync/push`.
2. POST the exact same batch again.
3. Confirm:
   - No duplicate Attendance rows were created.
   - The second response still returns the event in `acked` (and `alreadyProcessed`).
4. Check `/debug/processed-events` to verify the idempotencyKey is stored once.

## Next Phases

- Outbox pattern and sync services expansion
- Validators and domain services expansion
