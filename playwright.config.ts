import { defineConfig } from '@playwright/test';

const schema = process.env.SHOP_TEST_DATABASE;
if (!schema || !/^shop_demo_test_[a-f0-9]{24}$/.test(schema) || new URL(process.env.DATABASE_URL || 'mysql://localhost/').pathname !== `/${schema}`) {
  throw new Error('Run Playwright through pnpm test or pnpm test:ui with TEST_DATABASE_URL to provision an isolated database.');
}

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:15173', trace: 'retain-on-failure' },
  webServer: [
    { command: 'pnpm dev:api', url: 'http://127.0.0.1:18788/api/health', reuseExistingServer: false, timeout: 30_000, env: { PORT: '18788' } },
    { command: 'pnpm dev:web --port 15173 --strictPort', url: 'http://127.0.0.1:15173', reuseExistingServer: false, timeout: 30_000, env: { VITE_API_PROXY_TARGET: 'http://127.0.0.1:18788' } }
  ]
});
