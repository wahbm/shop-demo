import { expect, test } from '@playwright/test';

const admin = { phone: '13900000001', password: 'Admin1234' };

test('管理员可以登录、查看经营概览并管理商品', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL('/admin/login');
  await page.getByTestId('admin-phone-input').fill(admin.phone);
  await page.getByTestId('admin-password-input').fill(admin.password);
  await page.getByTestId('admin-captcha-input').fill('1234');
  await page.getByTestId('admin-login-submit').click();
  await expect(page.getByRole('heading', { name: '营销数据统计' })).toBeVisible();
  await page.getByTestId('admin-products-nav').click();
  await expect(page.getByRole('heading', { name: '商品管理' })).toBeVisible();
  await page.getByTestId('admin-add-product').click();
  await page.getByTestId('admin-product-name').fill('后台新增测试商品');
  await page.getByTestId('admin-product-price').fill('88');
  await page.getByTestId('admin-product-stock').fill('12');
  await page.getByTestId('admin-product-description').fill('供管理后台自动化测试使用。');
  await page.getByTestId('admin-save-product').click();
  await expect(page.getByText('后台新增测试商品')).toBeVisible();
});

test('管理接口拒绝普通商城会话', async ({ request }) => {
  const customerLogin = await request.post('/api/auth/login', { data: { phone: '13800000000', password: 'Demo1234', captcha: '1234' } });
  expect(customerLogin.ok()).toBeTruthy();
  const dashboard = await request.get('/api/admin/dashboard');
  expect(dashboard.status()).toBe(401);
  await expect(dashboard.json()).resolves.toMatchObject({ message: '请使用管理员账号登录' });
});
