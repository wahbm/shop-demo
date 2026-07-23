# Architecture

## Stack and request flow

React 19 + Vite serves the SPA. `worker/index.ts` is a Hono Cloudflare Worker handling `/api/*`; Worker assets serve `dist/` and fall back to the SPA shell. D1 binding `DB` stores all application state. Session state is an HTTP-only `demo_session` cookie containing a user id.

```
Browser → Worker assets / React SPA → /api/* → Hono → D1 (DB)
```

## Layout

- `src/`: React routes, API client, styles, stable `data-testid` contracts.
- `worker/index.ts`: all JSON API endpoints and validation.
- `migrations/0001_init.sql`: initial schema plus fixed seed dataset.
- `scripts/reset-local-d1.ts`: local D1 reset only.
- `tests/`: Playwright UI and API scenarios.
- `wrangler.jsonc`: Worker, D1 and static asset bindings.
- `.github/workflows/deploy.yml`: main-branch migration then deployment.

## Data and deployment decisions

- D1 replaces file-backed SQLite so data persists in serverless production.
- `0001_init.sql` seeds 24 products, one demo user, address, and order. Remote migrations are tracked by Wrangler; create new numbered files for schema/data evolution.
- Checkout is a local immediate-success simulation. There is no third-party payment, email, OAuth, coupon, review, refund, or admin system.
- GitHub Actions requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; no credential belongs in code or `wrangler.jsonc`.

## API surface

`/api/auth/*`, `/api/categories`, `/api/products`, `/api/cart`, `/api/addresses`, `/api/checkout`, and `/api/orders`. Preserve response messages and test IDs when teaching scripts rely on them.
