import { expect, test } from '@playwright/test';

const demoUser = { phone: '13800000000', password: 'Demo1234' };

test.describe.configure({ mode: 'serial' });

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('phone-input').fill(demoUser.phone);
  await page.getByTestId('password-input').fill(demoUser.password);
  await page.getByTestId('captcha-input').fill('1234');
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL('/');
}

test('登录失败会给出稳定错误信息', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('phone-input').fill(demoUser.phone);
  await page.getByTestId('password-input').fill('错误密码');
  await page.getByTestId('captcha-input').fill('1234');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('alert')).toHaveText('手机号或密码错误');
});

test('搜索、加购、添加地址、结算和查单', async ({ page }) => {
  await login(page);
  await page.getByTestId('search-input').fill('耳机');
  await page.getByTestId('search-submit').click();
  await expect(page).toHaveURL(/products\?q=/);
  await expect(page.getByTestId('product-card-1')).toBeVisible();
  await page.getByTestId('product-card-1').click();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByRole('alert')).toHaveText('已加入购物车');
  await page.getByTestId('cart-link').click();
  await expect(page.getByTestId('cart-item-1')).toBeVisible();
  await page.getByTestId('checkout-button').click();
  await page.getByTestId('address-recipient').fill('自动化测试用户');
  await page.getByTestId('address-phone').fill('13900000000');
  await page.getByTestId('address-detail').fill('北京市海淀区测试大道 100 号');
  await page.getByTestId('add-address').click();
  await page.getByTestId('address-2').click();
  await page.getByTestId('pay-button').click();
  await expect(page).toHaveURL(/orders\?created=SHOP-0002/);
  await expect(page.getByRole('alert')).toHaveText('订单 SHOP-0002 已支付成功');
  await expect(page.getByTestId('order-SHOP-0002')).toContainText('已支付');
});

test('未登录购物车被拦截', async ({ page }) => {
  await page.goto('/cart');
  await expect(page).toHaveURL('/login');
});

test('账户二级菜单和地址簿支持新增、编辑与删除', async ({ page }) => {
  await login(page);
  await expect(page.getByTestId('user-phone')).toHaveText(demoUser.phone);
  await page.getByTestId('account-menu').hover();
  await expect(page.getByTestId('account-menu-orders')).toBeVisible();
  await expect(page.getByTestId('account-menu-addresses')).toBeVisible();
  await page.getByTestId('account-menu-addresses').click();
  await expect(page).toHaveURL('/account/addresses');

  await page.getByTestId('new-address-button').click();
  await page.getByTestId('address-recipient').fill('地址簿测试用户');
  await page.getByTestId('address-phone').fill('13700000000');
  await page.getByTestId('address-detail').fill('杭州市西湖区测试路 88 号');
  await page.getByTestId('save-address').click();

  const row = page.locator('[data-testid^="address-row-"]').filter({ hasText: '地址簿测试用户' });
  await expect(row).toContainText('杭州市西湖区测试路 88 号');
  await row.getByRole('button', { name: '编辑' }).click();
  await page.getByTestId('address-detail').fill('杭州市西湖区更新路 99 号');
  await page.getByTestId('save-address').click();
  await expect(row).toContainText('杭州市西湖区更新路 99 号');
  await row.getByRole('button', { name: '删除' }).click();
  await expect(row).toHaveCount(0);
});
