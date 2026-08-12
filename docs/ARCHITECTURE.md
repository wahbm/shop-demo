# Architecture

## Stack and request flow

React 19 + Vite serves the SPA. `worker/index.ts` contains the Hono `/api/*` behavior for local D1 development. In ECS production, `server/index.ts` runs the same Hono app using a MariaDB-backed D1-compatible adapter; Nginx serves `dist/` and proxies API requests. Storefront and administrator sessions use separate HTTP-only cookies: `demo_session` and `demo_admin_session`.

```
Browser → Nginx / React SPA → /ww/shop-demo/api/* → Hono → MariaDB
```

## Layout

- `src/`: React routes, API client, styles, stable `data-testid` contracts. `admin.tsx` and `admin.css`/`admin-frame.css` provide the administrator console.
- `worker/index.ts`: all JSON API endpoints and validation, shared by local Worker and ECS Node runtime.
- `server/index.ts`: ECS Node entrypoint; `server/mysql-d1.ts` adapts MariaDB to the existing API data calls.
- `server/mysql-migrations.ts`: idempotently adds MariaDB columns needed by existing ECS deployments before the API starts.
- `migrations/0001_init.sql`: initial schema plus fixed seed dataset.
- `migrations/0002_admin_console.sql`: administrator role and product sale-status fields plus the administrator seed account.
- `migrations/0003_product_covers.sql`: product cover object references stored alongside the product record.
- `scripts/reset-local-d1.ts`: local D1 reset only.
- `tests/`: Playwright UI and API scenarios.
- `wrangler.jsonc`: local Worker/D1 development bindings.
- `.github/workflows/deploy.yml`: main-branch ECS deployment.

## Data and deployment decisions

- MariaDB gives ECS deployments a persistent shared database while isolating each project into its own schema and user. The ECS API startup checks and applies additive schema changes; `pnpm db:migrate:mysql` is also available for a manual migration.
- The first two migrations seed 24 products, one customer, one administrator, an address, and an order. Remote migrations are tracked by Wrangler; create new numbered files for schema/data evolution.
- Checkout is a local immediate-success simulation. There is no third-party payment, email, OAuth, coupon, review, refund, or administrative capability beyond the demo console.
- `/admin` is a protected demo administrator console, not a production-grade back-office. It supplies data metrics and product lifecycle management; its standalone product creation screen is embedded into the list page through a same-origin iframe and `postMessage` completion events.
- Product covers use the `src/cloudbase-storage.ts` adapter. The browser previews a selected image with an object URL, then calls the deployed public file proxy for upload, preview, download, update and deletion. The proxy writes `projects/<projectId>/product-covers/<uuid>.<ext>` to the public CloudBase `public-assets` Bucket; the browser never initializes the CloudBase SDK or receives a service credential. `products` stores only the bucket/path and technical metadata, while the proxy derives mutable `contentUrl` and `downloadUrl` values from the stored reference.
- GitHub Actions requires organization deployment variables plus the restricted `SSH_PRIVATE_KEY`; no credential belongs in code.

## API surface

`/api/auth/*`, `/api/categories`, `/api/products`, `/api/cart`, `/api/addresses`, `/api/checkout`, `/api/orders`, and protected `/api/admin/auth/*`, `/api/admin/dashboard`, `/api/admin/products*`. Public product routes filter out inactive products; checkout blocks carts containing an inactive product. Preserve response messages and test IDs when teaching scripts rely on them.
