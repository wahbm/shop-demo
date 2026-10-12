# Architecture

## Stack and request flow

React 19 + Vite serves the SPA. `server/app.ts` contains the Hono `/api/*` behavior and `server/index.ts` starts it with the MariaDB adapter. Nginx serves `dist/` and proxies API requests. Storefront and administrator sessions use separate HTTP-only cookies: `demo_session` and `demo_admin_session`.

```
Browser → Nginx / React SPA → /ww/shop-demo/api/* → Hono → MariaDB
```

## Layout

- `src/`: React routes, API client, styles, stable `data-testid` contracts. `admin.tsx` and `admin.css`/`admin-frame.css` provide the administrator console.
- `server/openapi.ts`: OpenAPI contracts and Swagger UI HTML, served at `/api/openapi.json` and `/api/docs`; relative URLs support the ECS path prefix.
- `server/app.ts`: all JSON API endpoints and validation for the ECS Node runtime.
- `server/index.ts`: ECS Node entrypoint; `server/mysql.ts` adapts MariaDB query results for the API data calls.
- `server/mysql-migrations.ts`: idempotently adds MariaDB columns needed by existing ECS deployments before the API starts.
- `server/schema.mysql.sql`: initial MariaDB schema plus fixed seed dataset.
- `server/migrations/0003_product_covers.sql`: reference SQL for the additive product-cover migration.
- `tests/`: Playwright UI and API scenarios against the ECS-compatible Node service.
- `.github/workflows/deploy.yml`: main-branch ECS deployment.

## Data and deployment decisions

- MariaDB gives ECS deployments a persistent shared database while isolating each project into its own schema and user. The ECS API startup checks and applies additive schema changes; `pnpm db:migrate:mysql` is also available for a manual migration.
- `server/schema.mysql.sql` seeds 24 products, one customer, one administrator, an address, and an order. Additive schema changes belong in `server/mysql-migrations.ts` and matching reference SQL files.
- Checkout is a local immediate-success simulation. There is no third-party payment, email, OAuth, coupon, review, refund, or administrative capability beyond the demo console.
- `/admin` is a protected demo administrator console, not a production-grade back-office. It supplies data metrics and product lifecycle management; its standalone product creation screen is embedded into the list page through a same-origin iframe and `postMessage` completion events.
- Product covers use the `src/cloudbase-storage.ts` adapter. The browser previews a selected image with an object URL, then calls the deployed public file proxy for upload, preview, download, update and deletion. The proxy writes `projects/<projectId>/product-covers/<uuid>.<ext>` to the public CloudBase `public-assets` Bucket; the browser never initializes the CloudBase SDK or receives a service credential. `products` stores only the bucket/path and technical metadata, while the proxy derives mutable `contentUrl` and `downloadUrl` values from the stored reference.
- GitHub Actions requires organization deployment variables plus the restricted `SSH_PRIVATE_KEY`; no credential belongs in code.

## API surface

`/api/auth/*`, `/api/categories`, `/api/products`, `/api/cart`, `/api/addresses`, `/api/checkout`, `/api/orders`, and protected `/api/admin/auth/*`, `/api/admin/dashboard`, `/api/admin/products*`. Public product routes filter out inactive products; checkout blocks carts containing an inactive product. Preserve response messages and test IDs when teaching scripts rely on them.

Swagger UI documents all 27 business operations and loads pinned CDN assets; the JSON specification is served locally. Browser debugging uses the existing same-origin login cookies. Keep contracts in sync with route changes; documentation tests check coverage and URL resolution.
