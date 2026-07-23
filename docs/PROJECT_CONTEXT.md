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
- Validation completed: `pnpm exec tsc --noEmit`, `pnpm build`, and `pnpm test` (4 Playwright tests passed).

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
