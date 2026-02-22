# ATTENDANCE_CHECKIN Outbox Event

Source: Local attendance check-in flow (`src/lib/server/services/attendanceService.ts`).

Event type: `ATTENDANCE_CHECKIN`
Idempotency key: `attendance-checkin:${attendanceId}`

Payload
```json
{
  "attendanceId": "cuid",
  "memberId": "cuid",
  "checkinAt": "2026-02-06T12:34:56.000Z",
  "checkinDate": "2026-02-06",
  "snapshots": {
    "member": {
      "id": "cuid",
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
}
```

Notes
- `memberId` must match `snapshots.member.id`.
- `checkinAt` is an ISO-8601 timestamp; `checkinDate` is `YYYY-MM-DD`.
- Additional payload fields are ignored by the server ingest.
