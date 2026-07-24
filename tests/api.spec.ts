import { expect, test } from '@playwright/test';

test('核心 API 返回可预测的验证错误', async ({ request }) => {
  const anonymousCart = await request.get('/api/cart');
  expect(anonymousCart.status()).toBe(401);
  await expect(anonymousCart.json()).resolves.toMatchObject({ message: '请先登录后再继续' });

  const duplicate = await request.post('/api/auth/register', { data: { phone: '13800000000', name: '重复用户', password: 'Demo1234', confirmPassword: 'Demo1234', captcha: '1234' } });
  expect(duplicate.status()).toBe(409);
  await expect(duplicate.json()).resolves.toMatchObject({ message: '该手机号已注册' });

  const login = await request.post('/api/auth/login', { data: { phone: '13800000000', password: 'Demo1234', captcha: '1234' } });
  expect(login.ok()).toBeTruthy();
  const invalidProduct = await request.post('/api/cart', { data: { productId: 9999, quantity: 1 } });
  expect(invalidProduct.status()).toBe(404);
  await expect(invalidProduct.json()).resolves.toMatchObject({ message: '商品不存在' });
  const noAddress = await request.post('/api/checkout', { data: { addressId: 9999 } });
  expect(noAddress.status()).toBe(400);
  await expect(noAddress.json()).resolves.toMatchObject({ message: '请选择有效的收货地址' });
});

test('已下架商品会保留在购物车中并阻止结算', async ({ request }) => {
  const customerRegistration = await request.post('/api/auth/register', { data: { phone: '13600000001', name: '下架商品测试用户', password: 'Demo1234', confirmPassword: 'Demo1234', captcha: '1234' } });
  expect(customerRegistration.ok()).toBeTruthy();
  const addressResponse = await request.post('/api/addresses', { data: { recipient: '下架商品测试用户', phone: '13600000001', detail: '测试路 24 号', isDefault: true } });
  const address = await addressResponse.json() as { address: { id: number } };
  const addToCart = await request.post('/api/cart', { data: { productId: 24, quantity: 1 } });
  expect(addToCart.ok()).toBeTruthy();

  const adminLogin = await request.post('/api/admin/auth/login', { data: { phone: '13900000001', password: 'Admin1234', captcha: '1234' } });
  expect(adminLogin.ok()).toBeTruthy();
  const deactivate = await request.patch('/api/admin/products/24/status', { data: { isActive: false } });
  expect(deactivate.ok()).toBeTruthy();

  const cart = await request.get('/api/cart');
  await expect(cart.json()).resolves.toMatchObject({ items: [expect.objectContaining({ productId: 24, is_active: 0 })] });
  const checkout = await request.post('/api/checkout', { data: { addressId: address.address.id } });
  expect(checkout.status()).toBe(400);
  await expect(checkout.json()).resolves.toMatchObject({ message: '购物车中有已下架商品，请删除后再结算' });
});
