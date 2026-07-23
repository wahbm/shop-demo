# Repository instructions

- Work on `main` only when the user explicitly wants a direct release; otherwise use a branch and PR. PRs must be ready for review, not drafts.
- Run `pnpm test` for behavior changes and `pnpm exec tsc --noEmit && pnpm build` for configuration/runtime changes.
- `migrations/` is append-only after remote application. Add a numbered migration; never alter `0001_init.sql` or manually reset remote D1.
- Keep API selectors and `data-testid` values stable unless corresponding Playwright tests and README contracts are updated together.
- Do not commit `.wrangler/`, `dist/`, test artifacts, local data, or credentials. GitHub Actions consumes `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
