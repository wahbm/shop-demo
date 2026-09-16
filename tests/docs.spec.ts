import { expect, test } from '@playwright/test';
import app from '../server/app';

test('OpenAPI 覆盖全部业务路由且引用有效', async ({ request }) => {
  const response = await request.get('/api/openapi.json');
  expect(response.status()).toBe(200);
  const spec = await response.json();
  expect(spec.openapi).toBe('3.0.3');
  const actual = app.routes.filter((route) => !['/api/docs', '/api/docs/', '/api/openapi.json'].includes(route.path))
    .map((route) => `${route.method.toLowerCase()} ${route.path.replace(/^\/api/, '').replace(/:(\w+)/g, '{$1}')}`).sort();
  const documented = Object.entries(spec.paths).flatMap(([path, methods]) => Object.keys(methods as object).map((method) => `${method} ${path}`)).sort();
  expect(documented).toEqual(actual);
  function check(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref') expect(spec.components.schemas[String(child).split('/').pop()!]).toBeDefined();
      else check(child);
    }
  }
  check(spec);
  for (const base of ['http://localhost/api/openapi.json', 'http://localhost/ww/shop-demo/api/openapi.json']) {
    expect(new URL(spec.servers[0].url, base).pathname).toBe(new URL(base).pathname.replace('openapi.json', ''));
  }
});

test('文档入口支持尾斜杠和代理路径', async ({ page, request }) => {
  // Isolate our URL configuration from CDN availability.
  await page.route('https://unpkg.com/**', (route) => route.fulfill({
    contentType: route.request().url().endsWith('.js') ? 'text/javascript' : 'text/css',
    body: route.request().url().endsWith('.js') ? 'window.SwaggerUIBundle = (config) => { window.docsConfig = config; };' : '',
  }));
  const html = await (await request.get('/api/docs')).text();
  for (const path of ['/api/docs', '/api/docs/', '/ww/shop-demo/api/docs', '/ww/shop-demo/api/docs/']) {
    if (path.startsWith('/ww/')) await page.route(`**${path}`, (route) => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(path);
    await expect(page).toHaveTitle('微光集市 API 文档');
    const config = await page.evaluate(() => (window as unknown as { docsConfig: { url: string; withCredentials: boolean } }).docsConfig);
    expect(new URL(config.url).pathname).toBe(path.replace(/\/docs\/?$/, '/openapi.json'));
    expect(config.withCredentials).toBe(true);
  }
});
