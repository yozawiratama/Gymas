# Server DB Layer

Phase 1 uses a single Prisma client backed by MySQL.

- `serverPrisma` for the MySQL database
- Generated client lives at `src/lib/server/db/prisma-server`

Schema and migrations live under `prisma/`:

- `prisma/schema.prisma`
- `prisma/migrations`
