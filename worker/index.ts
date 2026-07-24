import { Hono, type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

type Bindings = { DB: D1Database; ASSETS: Fetcher };
type User = { id: number; phone: string; name: string };
type Admin = User & { role: 'admin' };
type Product = { id: number; category_id: number; categoryName: string; name: string; description: string; price: number; stock: number; emoji: string; is_active: number };
type CartItem = { productId: number; quantity: number; name: string; price: number; stock: number; emoji: string };

const app = new Hono<{ Bindings: Bindings }>();
const CAPTCHA = '1234';
type AppContext = Context<{ Bindings: Bindings }>;

async function currentUser(c: AppContext): Promise<User | null> {
  const id = Number(getCookie(c, 'demo_session'));
  if (!id) return null;
  return c.env.DB.prepare('SELECT id, phone, name FROM users WHERE id = ?').bind(id).first<User>();
}
async function requireUser(c: AppContext): Promise<User | null> {
  const user = await currentUser(c);
  if (!user) c.status(401);
  return user;
}
const unauthorized = (c: AppContext) => c.json({ message: '请先登录后再继续' }, 401);
async function currentAdmin(c: AppContext): Promise<Admin | null> {
  const id = Number(getCookie(c, 'demo_admin_session'));
  if (!id) return null;
  return c.env.DB.prepare("SELECT id, phone, name, role FROM users WHERE id = ? AND role = 'admin'").bind(id).first<Admin>();
}
async function requireAdmin(c: AppContext): Promise<Admin | null> {
  const admin = await currentAdmin(c);
  if (!admin) c.status(401);
  return admin;
}
const adminUnauthorized = (c: AppContext) => c.json({ message: '请使用管理员账号登录' }, 401);
async function products(db: D1Database, where = '', params: unknown[] = []) {
  const result = await db.prepare(`SELECT p.*, c.name AS categoryName FROM products p JOIN categories c ON c.id = p.category_id ${where} ORDER BY p.id`).bind(...params).all<Product>();
  return result.results;
}

app.get('/api/health', (c) => c.json({ ok: true }));
app.get('/api/auth/me', async (c) => c.json({ user: await currentUser(c) }));
app.post('/api/auth/register', async (c) => {
  const { phone, password, confirmPassword, captcha, name } = await c.req.json<any>();
  if (!/^1\d{10}$/.test(phone || '')) return c.json({ message: '请输入 11 位手机号码' }, 400);
  if (!password || password.length < 6) return c.json({ message: '密码至少需要 6 位' }, 400);
  if (password !== confirmPassword) return c.json({ message: '两次输入的密码不一致' }, 400);
  if (captcha !== CAPTCHA) return c.json({ message: '验证码不正确，请输入 1234' }, 400);
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first();
  if (existing) return c.json({ message: '该手机号已注册' }, 409);
  const result = await c.env.DB.prepare('INSERT INTO users (phone, name, password, created_at) VALUES (?, ?, ?, ?)').bind(phone, (name || '新用户').trim(), password, new Date().toISOString()).run();
  const id = Number(result.meta.last_row_id);
  const user = await c.env.DB.prepare('SELECT id, phone, name FROM users WHERE id = ?').bind(id).first<User>();
  setCookie(c, 'demo_session', String(id), { path: '/', httpOnly: true, sameSite: 'Lax' });
  return c.json({ user });
});
app.post('/api/auth/login', async (c) => {
  const { phone, password, captcha } = await c.req.json<any>();
  if (captcha !== CAPTCHA) return c.json({ message: '验证码不正确，请输入 1234' }, 400);
  const user = await c.env.DB.prepare('SELECT id, phone, name FROM users WHERE phone = ? AND password = ?').bind(phone, password).first<User>();
  if (!user) return c.json({ message: '手机号或密码错误' }, 401);
  setCookie(c, 'demo_session', String(user.id), { path: '/', httpOnly: true, sameSite: 'Lax' });
  return c.json({ user });
});
app.post('/api/auth/logout', (c) => { deleteCookie(c, 'demo_session', { path: '/' }); return c.json({ ok: true }); });

app.get('/api/categories', async (c) => c.json({ categories: (await c.env.DB.prepare('SELECT * FROM categories ORDER BY id').all()).results }));
app.get('/api/products', async (c) => {
  const q = c.req.query('q') || ''; const categoryId = c.req.query('categoryId');
  const clauses: string[] = ['p.is_active = 1']; const params: unknown[] = [];
  if (q) { clauses.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (categoryId) { clauses.push('p.category_id = ?'); params.push(Number(categoryId)); }
  return c.json({ products: await products(c.env.DB, clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params) });
});
app.get('/api/products/:id', async (c) => {
  const product = (await products(c.env.DB, 'WHERE p.id = ? AND p.is_active = 1', [Number(c.req.param('id'))]))[0];
  return product ? c.json(product) : c.json({ message: '商品不存在' }, 404);
});

app.get('/api/admin/auth/me', async (c) => c.json({ admin: await currentAdmin(c) }));
app.post('/api/admin/auth/login', async (c) => {
  const { phone, password, captcha } = await c.req.json<any>();
  if (captcha !== CAPTCHA) return c.json({ message: '验证码不正确，请输入 1234' }, 400);
  const admin = await c.env.DB.prepare("SELECT id, phone, name, role FROM users WHERE phone = ? AND password = ? AND role = 'admin'").bind(phone, password).first<Admin>();
  if (!admin) return c.json({ message: '管理员账号或密码错误' }, 401);
  setCookie(c, 'demo_admin_session', String(admin.id), { path: '/', httpOnly: true, sameSite: 'Lax' });
  return c.json({ admin });
});
app.post('/api/admin/auth/logout', (c) => { deleteCookie(c, 'demo_admin_session', { path: '/' }); return c.json({ ok: true }); });

app.get('/api/admin/dashboard', async (c) => {
  const admin = await requireAdmin(c); if (!admin) return adminUnauthorized(c);
  const [orders, productsCount, activeProducts, lowStock, customers, recentOrders] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total FROM orders WHERE status = '已支付'"),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM products'),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM products WHERE is_active = 1'),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM products WHERE stock <= 20'),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'"),
    c.env.DB.prepare('SELECT order_no, total, status, created_at FROM orders ORDER BY id DESC LIMIT 5'),
  ]);
  return c.json({
    metrics: {
      paidOrderCount: Number((orders.results[0] as any)?.count || 0), totalSales: Number((orders.results[0] as any)?.total || 0),
      productCount: Number((productsCount.results[0] as any)?.count || 0), activeProductCount: Number((activeProducts.results[0] as any)?.count || 0),
      lowStockCount: Number((lowStock.results[0] as any)?.count || 0), customerCount: Number((customers.results[0] as any)?.count || 0),
    }, recentOrders: recentOrders.results,
  });
});
app.get('/api/admin/products', async (c) => {
  const admin = await requireAdmin(c); if (!admin) return adminUnauthorized(c);
  const q = c.req.query('q') || ''; const categoryId = c.req.query('categoryId'); const status = c.req.query('status');
  const clauses: string[] = []; const params: unknown[] = [];
  if (q) { clauses.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (categoryId) { clauses.push('p.category_id = ?'); params.push(Number(categoryId)); }
  if (status === 'active' || status === 'inactive') { clauses.push('p.is_active = ?'); params.push(status === 'active' ? 1 : 0); }
  return c.json({ products: await products(c.env.DB, clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params) });
});
app.post('/api/admin/products', async (c) => {
  const admin = await requireAdmin(c); if (!admin) return adminUnauthorized(c);
  const { name, description, price, stock, emoji, categoryId, isActive = true } = await c.req.json<any>();
  if (!name?.trim() || !description?.trim() || !emoji?.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) return c.json({ message: '请完整填写商品信息，价格和库存不能为负数' }, 400);
  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(Number(categoryId)).first();
  if (!category) return c.json({ message: '请选择有效的商品分类' }, 400);
  const result = await c.env.DB.prepare('INSERT INTO products (category_id, name, description, price, stock, emoji, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(Number(categoryId), name.trim(), description.trim(), Number(price), Number(stock), emoji.trim(), isActive ? 1 : 0).run();
  return c.json({ product: (await products(c.env.DB, 'WHERE p.id = ?', [Number(result.meta.last_row_id)]))[0] }, 201);
});
app.patch('/api/admin/products/:id', async (c) => {
  const admin = await requireAdmin(c); if (!admin) return adminUnauthorized(c);
  const id = Number(c.req.param('id')); const existing = await c.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ message: '商品不存在' }, 404);
  const { name, description, price, stock, emoji, categoryId, isActive } = await c.req.json<any>();
  if (!name?.trim() || !description?.trim() || !emoji?.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) return c.json({ message: '请完整填写商品信息，价格和库存不能为负数' }, 400);
  const category = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(Number(categoryId)).first();
  if (!category) return c.json({ message: '请选择有效的商品分类' }, 400);
  await c.env.DB.prepare('UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, stock = ?, emoji = ?, is_active = ? WHERE id = ?').bind(Number(categoryId), name.trim(), description.trim(), Number(price), Number(stock), emoji.trim(), isActive ? 1 : 0, id).run();
  return c.json({ product: (await products(c.env.DB, 'WHERE p.id = ?', [id]))[0] });
});
app.patch('/api/admin/products/:id/status', async (c) => {
  const admin = await requireAdmin(c); if (!admin) return adminUnauthorized(c);
  const id = Number(c.req.param('id')); const isActive = Boolean((await c.req.json<any>()).isActive);
  const result = await c.env.DB.prepare('UPDATE products SET is_active = ? WHERE id = ?').bind(isActive ? 1 : 0, id).run();
  return result.meta.changes ? c.json({ ok: true }) : c.json({ message: '商品不存在' }, 404);
});

app.get('/api/cart', async (c) => {
  const user = await requireUser(c); if (!user) return unauthorized(c);
  const result = await c.env.DB.prepare('SELECT ci.product_id AS productId, ci.quantity, p.name, p.price, p.stock, p.emoji FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.user_id = ? AND p.is_active = 1 ORDER BY ci.product_id').bind(user.id).all<CartItem>();
  return c.json({ items: result.results });
});
app.post('/api/cart', async (c) => {
  const user = await requireUser(c); if (!user) return unauthorized(c);
  const { productId, quantity = 1 } = await c.req.json<any>(); const amount = Number(quantity);
  const product = await c.env.DB.prepare('SELECT id, stock FROM products WHERE id = ? AND is_active = 1').bind(Number(productId)).first<{ id: number; stock: number }>();
  if (!product) return c.json({ message: '商品不存在' }, 404);
  if (!Number.isInteger(amount) || amount < 1) return c.json({ message: '商品数量必须至少为 1' }, 400);
  const existing = await c.env.DB.prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?').bind(user.id, product.id).first<{ quantity: number }>();
  if ((existing?.quantity || 0) + amount > product.stock) return c.json({ message: '库存不足，无法加入更多' }, 400);
  if (existing) await c.env.DB.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?').bind(amount, user.id, product.id).run();
  else await c.env.DB.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').bind(user.id, product.id, amount).run();
  return c.json({ ok: true });
});
app.patch('/api/cart/:productId', async (c) => {
  const user = await requireUser(c); if (!user) return unauthorized(c);
  const quantity = Number((await c.req.json<any>()).quantity); const productId = Number(c.req.param('productId'));
  const product = await c.env.DB.prepare('SELECT stock FROM products WHERE id = ? AND is_active = 1').bind(productId).first<{ stock: number }>();
  if (!product) return c.json({ message: '商品不存在' }, 404);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) return c.json({ message: '数量超出可购买范围' }, 400);
  const result = await c.env.DB.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').bind(quantity, user.id, productId).run();
  return result.meta.changes ? c.json({ ok: true }) : c.json({ message: '购物车中没有该商品' }, 404);
});
app.delete('/api/cart/:productId', async (c) => { const user = await requireUser(c); if (!user) return unauthorized(c); await c.env.DB.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').bind(user.id, Number(c.req.param('productId'))).run(); return c.json({ ok: true }); });

app.get('/api/addresses', async (c) => { const user = await requireUser(c); if (!user) return unauthorized(c); const result = await c.env.DB.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').bind(user.id).all(); return c.json({ addresses: result.results }); });
app.post('/api/addresses', async (c) => {
  const user = await requireUser(c); if (!user) return unauthorized(c);
  const { recipient, phone, detail, isDefault = false } = await c.req.json<any>();
  if (!recipient?.trim() || !/^1\d{10}$/.test(phone || '') || !detail?.trim()) return c.json({ message: '请完整填写收货人、手机号和详细地址' }, 400);
  const statements = isDefault ? [c.env.DB.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').bind(user.id)] : [];
  statements.push(c.env.DB.prepare('INSERT INTO addresses (user_id, recipient, phone, detail, is_default) VALUES (?, ?, ?, ?, ?)').bind(user.id, recipient.trim(), phone, detail.trim(), isDefault ? 1 : 0));
  const results = await c.env.DB.batch(statements);
  const id = Number(results[results.length - 1].meta.last_row_id);
  return c.json({ address: await c.env.DB.prepare('SELECT * FROM addresses WHERE id = ?').bind(id).first() });
});
app.patch('/api/addresses/:id', async (c) => {
  const user = await requireUser(c); if (!user) return unauthorized(c);
  const id = Number(c.req.param('id'));
  const existing = await c.env.DB.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').bind(id, user.id).first<any>();
  if (!existing) return c.json({ message: '收货地址不存在' }, 404);
  const { recipient, phone, detail, isDefault = false } = await c.req.json<any>();
  if (!recipient?.trim() || !/^1\d{10}$/.test(phone || '') || !detail?.trim()) return c.json({ message: '请完整填写收货人、手机号和详细地址' }, 400);
  const statements = isDefault ? [c.env.DB.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').bind(user.id)] : [];
  statements.push(c.env.DB.prepare('UPDATE addresses SET recipient = ?, phone = ?, detail = ?, is_default = ? WHERE id = ? AND user_id = ?').bind(recipient.trim(), phone, detail.trim(), isDefault ? 1 : 0, id, user.id));
  await c.env.DB.batch(statements);
  return c.json({ address: await c.env.DB.prepare('SELECT * FROM addresses WHERE id = ?').bind(id).first() });
});
app.delete('/api/addresses/:id', async (c) => {
  const user = await requireUser(c); if (!user) return unauthorized(c);
  const id = Number(c.req.param('id'));
  const address = await c.env.DB.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').bind(id, user.id).first<{ is_default: number }>();
  if (!address) return c.json({ message: '收货地址不存在' }, 404);
  await c.env.DB.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  if (address.is_default) {
    const replacement = await c.env.DB.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1').bind(user.id).first<{ id: number }>();
    if (replacement) await c.env.DB.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').bind(replacement.id).run();
  }
  return c.json({ ok: true });
});

app.post('/api/checkout', async (c) => {
  const user = await requireUser(c); if (!user) return unauthorized(c);
  const { addressId } = await c.req.json<any>();
  const address = await c.env.DB.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').bind(Number(addressId), user.id).first<any>();
  if (!address) return c.json({ message: '请选择有效的收货地址' }, 400);
  const itemResult = await c.env.DB.prepare('SELECT ci.product_id AS productId, ci.quantity, p.name, p.price, p.stock, p.emoji FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.user_id = ? AND p.is_active = 1').bind(user.id).all<CartItem>();
  const items = itemResult.results;
  if (!items.length) return c.json({ message: '购物车为空，无法结算' }, 400);
  if (items.some((item) => item.quantity > item.stock)) return c.json({ message: '部分商品库存不足，请调整后重试' }, 400);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM orders').first<{ count: number }>();
  const orderNo = `SHOP-${String((count?.count || 0) + 1).padStart(4, '0')}`;
  const order = c.env.DB.prepare('INSERT INTO orders (order_no, user_id, status, total, address_json, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(orderNo, user.id, '已支付', total, JSON.stringify(address), new Date().toISOString());
  const statements = [order, ...items.flatMap((item) => [c.env.DB.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity, emoji) VALUES ((SELECT id FROM orders WHERE order_no = ?), ?, ?, ?, ?, ?)').bind(orderNo, item.productId, item.name, item.price, item.quantity, item.emoji), c.env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').bind(item.quantity, item.productId)]), c.env.DB.prepare('DELETE FROM cart_items WHERE user_id = ?').bind(user.id)];
  const results = await c.env.DB.batch(statements);
  return c.json({ order: { id: Number(results[0].meta.last_row_id), orderNo } });
});
app.get('/api/orders', async (c) => { const user = await requireUser(c); if (!user) return unauthorized(c); const result = await c.env.DB.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').bind(user.id).all(); return c.json({ orders: result.results }); });
app.get('/api/orders/:id', async (c) => { const user = await requireUser(c); if (!user) return unauthorized(c); const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').bind(Number(c.req.param('id')), user.id).first<any>(); if (!order) return c.json({ message: '订单不存在' }, 404); const items = await c.env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all(); return c.json({ order, items: items.results }); });

export default app;
