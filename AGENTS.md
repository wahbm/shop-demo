# Repository instructions

- Work on `main` only when the user explicitly wants a direct release; otherwise use a branch and PR. PRs must be ready for review, not drafts.
- Run `pnpm test` for behavior changes and `pnpm exec tsc --noEmit && pnpm build` for configuration/runtime changes.
- `server/schema.mysql.sql` is the initial MariaDB schema; applied production changes are append-only. Additive changes belong in `server/mysql-migrations.ts` and matching reference SQL.
- Keep API selectors and `data-testid` values stable unless corresponding Playwright tests and README contracts are updated together.
- Do not commit `dist/`, test artifacts, local data, or credentials. GitHub Actions consumes the configured ECS deployment variables and `SSH_PRIVATE_KEY` secret.
