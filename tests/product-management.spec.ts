import { expect, test, type Page } from '@playwright/test';
import app from '../server/app';
import type { MysqlDatabase } from '../server/mysql';

const login = { phone: '13900000001', password: 'Admin1234', captcha: '1234' };
const input = { name: '简约验收商品', description: '商品管理验收', categoryId: 2, price: 12.5, stock: 8, emoji: '📦', isActive: false };
async function openAdmin(page: Page) {
  expect((await page.request.post('/api/admin/auth/login', { data: login })).ok()).toBeTruthy();
  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: '商品管理' })).toBeVisible();
}
async function create(page: Page, overrides = {}) {
  const response = await page.request.post('/api/admin/products', { data: { ...input, ...overrides } });
  expect(response.status()).toBe(201);
  return (await response.json()).product;
}

test('关键词、分类、状态及组合查询满足条件', async ({ page }) => {
  await openAdmin(page);
  const prefix = `查询${Date.now()}`;
  const a = await create(page, { name: `${prefix}简约`, isActive: true });
  const b = await create(page, { name: `${prefix}其他`, description: '简约描述匹配' });
  const c = await create(page, { name: `${prefix}简约办公`, categoryId: 3, isActive: true });
  const spec = await (await page.request.get('/api/openapi.json')).json();
  expect(spec.paths['/admin/products/{id}'].patch.responses['409']).toBeDefined();
  const categories = await (await page.request.get('/api/categories')).json();
  expect(categories.categories).toContainEqual({ id: 2, name: '居家好物' });
  const filters = page.locator('.admin-filter-bar');
  const query = async () => { const response = page.waitForResponse(r => r.url().includes('/api/admin/products?')); await filters.getByRole('button', { name: '查询', exact: true }).click(); await response; };
  await page.getByTestId('admin-product-search').fill(prefix);
  await query();
  for (const p of [a, b, c]) await expect(page.getByTestId(`admin-product-row-${p.id}`)).toBeVisible();
  await filters.locator('select').nth(0).selectOption('2'); await query();
  await expect(page.getByTestId(`admin-product-row-${c.id}`)).toHaveCount(0);
  await filters.locator('select').nth(1).selectOption('inactive'); await query();
  await expect(page.getByTestId(`admin-product-row-${b.id}`)).toBeVisible();
  await expect(page.getByTestId(`admin-product-row-${a.id}`)).toHaveCount(0);
  await page.getByTestId('admin-product-search').fill('简约');
  await filters.locator('select').nth(1).selectOption('active'); await query();
  await expect(page.getByTestId(`admin-product-row-${a.id}`)).toBeVisible();
  await expect(page.getByTestId(`admin-product-row-${b.id}`)).toHaveCount(0);
  await expect(page.getByTestId(`admin-product-row-${c.id}`)).toHaveCount(0);
  await filters.locator('select').nth(0).selectOption('');
  await filters.locator('select').nth(1).selectOption(''); await query();
  await expect(page.getByTestId(`admin-product-row-${b.id}`)).toBeVisible();
  await page.getByTestId('admin-product-search').fill(`不存在${prefix}`); await query();
  await expect(page.getByText('没有匹配的商品')).toBeVisible();
});

test('下架编辑、上架只读、上下架提示及状态变化冲突', async ({ page }) => {
  await openAdmin(page);
  const cover = { bucketId: 'public-assets', path: 'projects/test/product-covers/readonly.png', originalName: 'readonly.png', mimeType: 'image/png', sizeBytes: 16, visibility: 'public' };
  await page.route('**/files/test/product-covers/readonly.png/content', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/ZkAAAAASUVORK5CYII=', 'base64') }));
  const product = await create(page, { name: `编辑验收${Date.now()}`, cover });
  await page.reload();
  const row = page.getByTestId(`admin-product-row-${product.id}`);
  await page.getByTestId(`admin-edit-product-${product.id}`).click();
  await page.getByTestId('admin-product-name').fill(`${product.name}已修改`);
  await page.getByTestId('admin-save-product').click();
  await expect(page.getByRole('status')).toHaveText('编辑商品成功');
  await expect(row).toContainText(`${product.name}已修改`);
  await row.getByRole('button', { name: '上架', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('上架成功');
  await expect(row).toContainText('销售中');
  await page.getByTestId(`admin-edit-product-${product.id}`).click();
  const modal = page.locator('.admin-product-modal');
  for (const field of await modal.locator('fieldset input, fieldset select, fieldset textarea, fieldset button').all()) await expect(field).toBeDisabled();
  await expect(page.getByTestId('admin-save-product')).toBeDisabled();
  await expect(page.getByTestId('admin-remove-product-cover')).toBeDisabled();
  const denied = await page.request.patch(`/api/admin/products/${product.id}`, { data: { ...input, name: '禁止写入' } });
  expect(denied.status()).toBe(409);
  await modal.getByRole('button', { name: '取消', exact: true }).click();
  await row.getByRole('button', { name: '下架', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('下架成功');
  await expect(row).toContainText('已下架');
  await page.getByTestId(`admin-edit-product-${product.id}`).click();
  await page.getByTestId('admin-product-name').fill('过期编辑不可写入');
  await page.request.patch(`/api/admin/products/${product.id}/status`, { data: { isActive: true } });
  await page.getByTestId('admin-save-product').click();
  await expect(modal.getByRole('alert')).toHaveText('销售中商品不可编辑，请先下架');
  const persisted = await (await page.request.get(`/api/admin/products?q=${encodeURIComponent(product.name)}`)).json();
  expect(persisted.products[0]).toMatchObject({ name: `${product.name}已修改`, is_active: 1 });
  await modal.getByRole('button', { name: '取消', exact: true }).click();
  await row.getByRole('button', { name: '下架', exact: true }).click();
  await page.getByTestId(`admin-edit-product-${product.id}`).click();
  await modal.getByLabel('上架销售').check();
  await page.getByTestId('admin-save-product').click();
  await expect(row).toContainText('销售中');
});

test('独立新增成功返回列表并提示，封面格式校验和失败反馈', async ({ page }) => {
  await openAdmin(page);
  await page.goto('/admin/products/new');
  await page.getByTestId('admin-product-cover').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
  await expect(page.locator('.admin-cover-field .admin-error')).toBeVisible();
  const name = `独立新增${Date.now()}`;
  await page.getByTestId('admin-product-name').fill(name);
  await page.getByTestId('admin-product-price').fill('15');
  await page.getByTestId('admin-product-description').fill('独立新增验收');
  await page.route('**/api/admin/products', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: '模拟保存失败' }) }));
  await page.getByTestId('admin-save-product').click();
  await expect(page.getByRole('alert')).toHaveText('模拟保存失败');
  await expect(page.getByTestId('admin-product-name')).toHaveValue(name);
  await page.unroute('**/api/admin/products');
  await page.getByTestId('admin-save-product').click();
  await expect(page).toHaveURL('/admin/products');
  await expect(page.getByRole('status')).toHaveText('添加商品成功');
  const result = await (await page.request.get(`/api/admin/products?q=${encodeURIComponent(name)}`)).json();
  expect(result.products[0]).toMatchObject({ name, is_active: 1, cover_path: null });
});

test('编辑写入前状态改变时条件更新拒绝保存，包括保留和清除封面', async () => {
  for (const cover of [undefined, null]) {
    const db = { prepare(sql: string) { return {
      bind() { return this; },
      async first() { if (sql.includes('FROM users')) return { id: 1, role: 'admin' }; if (sql.includes('FROM products')) return { id: 1, is_active: 0 }; return { id: 2 }; },
      async run() { expect(sql).toContain('WHERE id = ? AND is_active = 0'); return { meta: { changes: 0 } }; },
    }; } } as unknown as MysqlDatabase;
    const response = await app.request('/api/admin/products/1', { method: 'PATCH', headers: { Cookie: 'demo_admin_session=1', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, cover }) }, { DB: db });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ message: '商品状态已变化，请刷新后先下架再编辑' });
  }
});
