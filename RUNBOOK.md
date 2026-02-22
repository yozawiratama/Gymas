# Gymas Runbook

## Health Checks
- `GET /health` returns `{ ok, env, version, time }` without touching the DB.
- `GET /health/db` runs a DB ping only when `HEALTH_DB_ENABLED=true`; otherwise it returns 404.

## Operational Pages (Admin Only)
- `/admin/ops/sync` shows sync ingestion and outbox backlog.
- `/admin/ops/audit` shows audit logs for sensitive actions.
- Access requires the `ops.view` permission (SUPER_ADMIN, OWNER, ADMIN).

## Common Issues

**Login Fails**
- Verify database connectivity (`DATABASE_URL`) and that migrations are applied.
- Confirm the user account is active and has a valid role.
- Check login throttling settings (`AUTH_LOGIN_WINDOW_MINUTES`, `AUTH_LOGIN_MAX_ATTEMPTS`).
- Ensure `APP_ENV=production` or `NODE_ENV=production` with HTTPS so secure cookies work.

**Sync 401 (Unauthorized)**
- Ensure the client sends the `x-sync-secret` header.
- Confirm `SYNC_SHARED_SECRET` is set and the service was restarted after changing it.

**Media 404 or Broken Images**
- Verify `storage/media` exists, is writable, and is mounted as persistent storage.
- Check that the media file still exists on disk for the referenced `media` record.
- Re-upload the asset if the file is missing.

**Database Connection Errors**
- Validate `DATABASE_URL` and network access to MySQL.
- Confirm `npm run prisma:migrate:deploy` ran successfully for this release.

**`/health/db` Returns 404**
- Set `HEALTH_DB_ENABLED=true` and restart the service.
- Disable again after diagnostics to reduce surface area.

## Logs
- Production logs are JSON written to stdout/stderr.
- Use the `X-Request-Id` response header to correlate requests with logs.

## Debug Routes
- `/debug/*` routes return 404 in production.
