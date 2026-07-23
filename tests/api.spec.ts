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
