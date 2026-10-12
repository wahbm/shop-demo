# Project guidance

Read `docs/PROJECT_CONTEXT.md` first, then `docs/ARCHITECTURE.md` before changing runtime, data, or deployment behavior.

- This is a teaching demo, not a production commerce system.
- Keep `pnpm test` green before committing; it runs against the configured MariaDB test database and does not reset shared data.
- Treat applied MariaDB schema changes as append-only; use `server/mysql-migrations.ts` and matching reference SQL for additive changes.
- Never place GitHub Secrets, database credentials, or other credentials in tracked files.
- Keep the ECS systemd, Nginx, and GitHub deployment contract stable unless the deployment change is explicit.
