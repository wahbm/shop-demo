# Project context

## Goal

`shop-demo` is a stable, fully localizable Chinese e-commerce demo for AI/UI automation training. It replaces a rate-limited teaching site with deterministic data, a fixed captcha (`1234`), and a complete core purchase flow.

## Current state

- Repository: `mosshqq/shop-demo` (private), default branch `main`.
- Production: `https://stable-shop-demo.wangpengyuanm.workers.dev`.
- Automatic deploy: push to `main` runs `.github/workflows/deploy.yml`.
- Completed: registration/login, catalog/category/search, product details, cart, address CRUD, simulated paid checkout, orders, API/UI Playwright coverage, D1 seed data, Worker deployment.

## Latest handoff (2026-07-23)

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
