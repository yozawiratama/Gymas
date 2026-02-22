# Release Checklist

## Pre-Release
- Confirm a fresh database and media backup exists.
- Verify required environment variables are set (`DATABASE_URL`, `DEVICE_ID`, `GYM_ID`, `SYNC_SHARED_SECRET`).
- Ensure `APP_ENV=production` or `NODE_ENV=production` in production.
- Run `npm run check`.
- Run `npm run build`.
- Run `npm run prisma:migrate:deploy`.
- Run `npm run prisma:seed` on first deployment or after a superadmin reset.
- Confirm `storage/media` is mounted and writable.

## Smoke Tests
- `GET /health` returns `ok: true`.
- `GET /health/db` returns 200 only when `HEALTH_DB_ENABLED=true`.
- Log in as SUPER_ADMIN.
- Open Members list and a member detail page.
- Perform an attendance check-in.
- Create a payment and confirm it appears in the member record.
- Upload a branding logo and verify it renders (media storage check).
- Open `/admin/ops/sync` and `/admin/ops/audit` as an admin role.

## Role-Based Access Spot Checks
- STAFF cannot access `/admin/*` or `/admin/ops/*`.
- FRONTDESK can only access attendance check-in.
- ADMIN, OWNER, SUPER_ADMIN can access ops and settings pages.
