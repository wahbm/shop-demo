# Project context

## Goal

`shop-demo` is a stable, fully localizable Chinese e-commerce demo for AI/UI automation training. It replaces a rate-limited teaching site with deterministic data, a fixed captcha (`1234`), and a complete core purchase flow.

## Current state

- Repository: `pilaingliang-0920/shop-demo` (private), default branch `main`.
- Production: `https://stable-shop-demo.wangpengyuanm.workers.dev`.
- Automatic deploy: push to `main` runs `.github/workflows/deploy.yml`.
- Completed: registration/login, catalog/category/search, product details, cart, address CRUD, simulated paid checkout, orders, API/UI Playwright coverage, D1 seed data, Worker deployment, and an administrator console.

## Latest handoff (2026-07-24)

- The administrator console is available at `/admin`, with a separate HTTP-only `demo_admin_session` cookie and protected `/api/admin/*` API surface. The administrator demo account is `13900000001` / `Admin1234`; the fixed captcha remains `1234`. Login fields are intentionally blank by default.
- The console includes marketing metrics (paid sales, orders, products, inventory warnings, users and recent orders) plus catalog search, filtering, editing, inventory changes and sale-status controls. Administrators can add products through a standalone `/admin/products/new?embedded=1` page loaded in a centered iframe modal from the product list.
- Product creation and editing support an optional CloudBase Storage cover. The image is previewed locally before save; upload uses the public `public-assets` Bucket and persists a random object path plus metadata through migration `0003_product_covers.sql`. The storefront renders the public cover URL when present and falls back to the existing emoji.
- Iframe completion and cancellation use same-origin `postMessage`; the parent closes the modal and refreshes the product list. If an administrator session expires inside the iframe, the login redirect preserves `embedded=1` so the creation page resumes after login.
- `migrations/0002_admin_console.sql` adds `users.role`, `products.is_active`, and the administrator seed user. The local reset script now executes every numbered migration in order.
- Public catalog endpoints only expose active products. Inactive cart products remain visible but cannot be updated or checked out; checkout returns a clear error until the customer removes them.
- Admin, API and storefront coverage now totals 9 Playwright tests. The storefront address test locates its newly created address by content rather than a generated id, so it remains stable with concurrent API coverage.
- Validation completed: `pnpm test` (9 Playwright tests), `pnpm exec tsc --noEmit`, and `pnpm build`.

## Previous handoff (2026-07-23)

- Every element that exposes `data-testid` now also has an identical `id`, including dynamic product, cart, address, and order selectors.
- Every `input` has a semantic `name` attribute; the search label now targets `search-input` to match its stable selector.
- Existing `data-testid` values were preserved, so current Playwright selectors remain compatible while browser automation can also use `id` or `name`.
- The top navigation now exposes **我的订单** and **地址簿** through the hover/focus **账户中心** secondary menu. Authenticated users see their phone number and a separate logout button.
- The address book is a table-based management page with create, read, update, delete, and default-address actions. `PATCH /api/addresses/:id` validates address updates; deleting the default address promotes a remaining address when available.
- New-address forms in both the address book and checkout now require linked province, city, and district selections. Changing a parent selection clears its children; the selected region is saved together with the street address. Existing addresses without structured region data remain editable.
- The client includes all provincial-level regions and commonly used city/district options. The stable selectors are `address-province`, `address-city`, and `address-district`; existing address selectors remain unchanged.
- Protected routes wait for `/api/auth/me` to resolve before redirecting, so a direct visit to an authenticated account page no longer flashes to the login page.
- Validation completed: `pnpm exec tsc --noEmit`, `pnpm build`, and `pnpm test` (5 Playwright tests passed, including the province/city/district address flow and address CRUD coverage).

## Commands

```bash
pnpm install
pnpm db:reset       # deletes only local .wrangler state, then reseeds local D1
pnpm dev            # Vite :5173 + local Worker/D1 :8787
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm cf:db:migrate  # apply pending migrations to remote D1
pnpm cf:deploy      # build and deploy Worker/assets
```

Demo login: `13800000000` / `Demo1234`; captcha: `1234`.

Admin demo login: `13900000001` / `Admin1234`; captcha: `1234`.
