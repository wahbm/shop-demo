# Architecture

## Stack and request flow

React 19 + Vite serves the SPA. `worker/index.ts` is a Hono Cloudflare Worker handling `/api/*`; Worker assets serve `dist/` and fall back to the SPA shell. D1 binding `DB` stores all application state. Storefront and administrator sessions use separate HTTP-only cookies: `demo_session` and `demo_admin_session`.

```
Browser → Worker assets / React SPA → /api/* → Hono → D1 (DB)
```

## Layout

- `src/`: React routes, API client, styles, stable `data-testid` contracts. `admin.tsx` and `admin.css`/`admin-frame.css` provide the administrator console.
- `worker/index.ts`: all JSON API endpoints and validation.
- `migrations/0001_init.sql`: initial schema plus fixed seed dataset.
- `migrations/0002_admin_console.sql`: administrator role and product sale-status fields plus the administrator seed account.
- `scripts/reset-local-d1.ts`: local D1 reset only.
- `tests/`: Playwright UI and API scenarios.
- `wrangler.jsonc`: Worker, D1 and static asset bindings.
- `.github/workflows/deploy.yml`: main-branch migration then deployment.

## Data and deployment decisions

- D1 replaces file-backed SQLite so data persists in serverless production.
- The first two migrations seed 24 products, one customer, one administrator, an address, and an order. Remote migrations are tracked by Wrangler; create new numbered files for schema/data evolution.
- Checkout is a local immediate-success simulation. There is no third-party payment, email, OAuth, coupon, review, refund, or administrative capability beyond the demo console.
- `/admin` is a protected demo administrator console, not a production-grade back-office. It supplies data metrics and product lifecycle management; its standalone product creation screen is embedded into the list page through a same-origin iframe and `postMessage` completion events.
- GitHub Actions requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; no credential belongs in code or `wrangler.jsonc`.

## API surface

`/api/auth/*`, `/api/categories`, `/api/products`, `/api/cart`, `/api/addresses`, `/api/checkout`, `/api/orders`, and protected `/api/admin/auth/*`, `/api/admin/dashboard`, `/api/admin/products*`. Public product routes filter out inactive products; checkout blocks carts containing an inactive product. Preserve response messages and test IDs when teaching scripts rely on them.
