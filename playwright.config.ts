import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  webServer: [
    { command: 'pnpm dev:api', url: 'http://127.0.0.1:8787/api/health', reuseExistingServer: !process.env.CI, timeout: 30_000 },
    { command: 'pnpm dev:web', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 30_000 }
  ]
});
