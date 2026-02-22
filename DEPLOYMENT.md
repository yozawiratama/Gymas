# Gymas Deployment

## Prerequisites
- Node.js 20 LTS (recommended) with npm
- MySQL 8.0+ (or compatible)

## Environment Variables

Required (all environments)
- `DATABASE_URL` (MySQL connection string)
- `DEVICE_ID` (device identifier used in sync payloads)
- `GYM_ID` (default gym identifier and default branch code)

Required in production
- `SYNC_SHARED_SECRET` (required to authorize `POST /sync/push`)

Required for initial seed or superadmin reset
- `SUPERADMIN_USERNAME`
- `SUPERADMIN_PASSWORD`

Optional / environment-specific
- `APP_ENV` (set to `production` in prod)
- `NODE_ENV` (set to `production` in prod)
- `HEALTH_DB_ENABLED` (set to `true` to enable `GET /health/db`)
- `AUTH_LOGIN_WINDOW_MINUTES` (login throttling window)
- `AUTH_LOGIN_MAX_ATTEMPTS` (max attempts within window)
- `SHADOW_DATABASE_URL` (required only for `npm run prisma:migrate:dev` in development)

## Install / Build / Run
1. `npm install`
2. `npm run prisma:generate`
3. `npm run prisma:migrate:deploy`
4. `npm run prisma:seed` (first deployment)
5. `npm run build`
6. `node build`

## Reverse Proxy + HTTPS
- Terminate TLS at the proxy/load balancer.
- Set `APP_ENV=production` or `NODE_ENV=production` so cookies are `Secure`.
- Forward `X-Forwarded-Proto` and `X-Forwarded-For` headers if your proxy provides them.

## Persistent Storage
- Media uploads are stored on disk at `storage/media` (relative to the app working directory).
- Mount this path as persistent storage and ensure it is writable by the app user.

## Migrations + Seed (Production)
- `npm run prisma:migrate:deploy`
- `npm run prisma:seed`

## Health Endpoints
- `GET /health` returns a lightweight JSON status without touching the DB.
- `GET /health/db` performs a DB ping only when `HEALTH_DB_ENABLED=true`; otherwise it returns 404.

## Debug Routes
- All `/debug/*` routes return 404 in production.
