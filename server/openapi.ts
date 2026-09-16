/** Keep these contracts aligned with server/app.ts; docs.spec.ts checks route coverage. */
type Schema = Record<string, unknown>;
const str = { type: 'string' };
const int = { type: 'integer' };
const num = { type: 'number' };
const bool = { type: 'boolean' };
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema => ({ type: 'object', properties, required });
const array = (items: Schema): Schema => ({ type: 'array', items });
const nullable = (schema: Schema): Schema => ({ ...schema, nullable: true });
const flag = { type: 'integer', enum: [0, 1] };
const phone = { type: 'string', pattern: '^1\\d{10}$', example: '13800000000' };
const login = object({ phone, password: { ...str, example: 'Demo1234' }, captcha: { ...str, enum: ['1234'] } });
const addressInput = object({ recipient: str, phone, detail: { ...str, description: '省市区与街道合并后的完整地址' }, isDefault: { ...bool, default: false } }, ['recipient', 'phone', 'detail']);
const productInput = object({ categoryId: int, name: str, description: str, price: { ...num, minimum: 0 }, stock: { ...int, minimum: 0 }, emoji: str, isActive: bool, cover: { allOf: [ref('ProductCover')], nullable: true, description: '省略时：创建无封面，编辑保留原封面；null 清除封面。文件需先通过公共文件代理上传。' } }, ['categoryId', 'name', 'description', 'price', 'stock', 'emoji']);
const schemas: Record<string, Schema> = {
  Error: object({ message: str }), Ok: object({ ok: { ...bool, enum: [true] } }),
  User: object({ id: int, phone: str, name: str }),
  Admin: object({ id: int, phone: str, name: str, role: { ...str, enum: ['admin'] } }),
  Category: object({ id: int, name: str }),
  ProductCover: object({ bucketId: { ...str, enum: ['public-assets'] }, path: { ...str, pattern: '^projects/[a-zA-Z0-9_-]+/product-covers/[a-zA-Z0-9-]+\\.(jpg|png|webp|gif)$', description: '扩展名须与 mimeType 一致' }, originalName: { ...str, minLength: 1, maxLength: 255 }, mimeType: { ...str, enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] }, sizeBytes: { ...int, minimum: 1, maximum: 20971520 }, visibility: { ...str, enum: ['public'] } }),
  Product: object({ id: int, category_id: int, categoryName: str, name: str, description: str, price: num, stock: int, emoji: str, is_active: flag, cover_bucket_id: nullable(str), cover_path: nullable(str), cover_original_name: nullable(str), cover_mime_type: nullable(str), cover_size_bytes: nullable(int), cover_visibility: { ...str, enum: ['public'] } }),
  ProductInput: productInput, AddressInput: addressInput,
  Address: object({ id: int, user_id: int, recipient: str, phone: str, detail: str, is_default: flag }),
  CartItem: object({ productId: int, quantity: int, name: str, price: num, stock: int, emoji: str, is_active: flag }),
  Order: object({ id: int, order_no: str, user_id: int, status: { ...str, example: '已支付' }, total: num, address_json: { ...str, description: 'JSON 字符串格式的收货地址快照' }, created_at: str }),
  OrderItem: object({ id: int, order_id: int, product_id: int, name: str, price: num, quantity: int, emoji: str }),
};
// Inline the nullable cover schema so OpenAPI 3.0 validators allow explicit null.
(productInput.properties as Record<string, Schema>).cover = { ...nullable(schemas.ProductCover), description: '省略时：创建无封面，编辑保留原封面；null 清除封面。文件需先通过公共文件代理上传。' };
const json = (schema: Schema) => ({ 'application/json': { schema } });
const paths: Record<string, Record<string, unknown>> = {};
function operation(method: string, path: string, tag: string, summary: string, response: Schema, options: { body?: Schema; auth?: 'customer' | 'admin'; errors?: number[]; status?: number; description?: string; query?: Record<string, Schema> } = {}) {
  const parameters = [...path.matchAll(/\{(\w+)\}/g)].map((match) => ({ name: match[1], in: 'path', required: true, schema: int }));
  const responses: Record<string, unknown> = { [options.status || 200]: { description: '成功', content: json(response) } };
  for (const code of new Set([...(options.errors || []), ...(options.auth ? [401] : [])])) responses[code] = { description: ({ 400: '参数错误或业务条件不满足', 401: '未登录或账号密码错误', 404: '资源不存在或不属于当前用户', 409: '手机号已注册' } as Record<number, string>)[code], content: json(ref('Error')) };
  (paths[path] ||= {})[method] = {
    tags: [tag], summary, operationId: `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_')}`, responses,
    ...(options.description ? { description: options.description } : {}),
    security: options.auth ? [{ [options.auth]: [] }] : [],
    parameters: [...parameters, ...Object.entries(options.query || {}).map(([name, schema]) => ({ name, in: 'query', required: false, schema }))],
    ...(options.body ? { requestBody: { required: true, content: json(options.body) } } : {}),
  };
}
operation('get', '/health', '系统', '健康检查', ref('Ok'));
for (const admin of [false, true]) {
  const prefix = admin ? '/admin/auth' : '/auth';
  const tag = admin ? '管理员认证' : '用户认证';
  const key = admin ? 'admin' : 'user';
  const user = ref(admin ? 'Admin' : 'User');
  operation('get', `${prefix}/me`, tag, '当前会话', object({ [key]: nullable(schemas[admin ? 'Admin' : 'User']) }), { description: '未登录时返回 null，HTTP 状态仍为 200。' });
  operation('post', `${prefix}/login`, tag, '登录', object({ [key]: user }), { body: admin ? object({ phone: { ...str, example: '13900000001' }, password: { ...str, example: 'Admin1234' }, captcha: { ...str, enum: ['1234'] } }) : login, errors: [400, 401], description: '成功后浏览器保存 HttpOnly 会话 Cookie，后续同源请求自动携带。' });
  operation('post', `${prefix}/logout`, tag, '退出登录', ref('Ok'));
}
operation('post', '/auth/register', '用户认证', '注册并登录', object({ user: ref('User') }), { body: object({ phone, password: { ...str, minLength: 6 }, confirmPassword: { ...str, description: '须与 password 一致' }, captcha: { ...str, enum: ['1234'] }, name: { ...str, default: '新用户' } }, ['phone', 'password', 'confirmPassword', 'captcha']), errors: [400, 409] });
const filters = { q: { ...str, description: '商品名或描述关键词' }, categoryId: int };
operation('get', '/categories', '商品', '分类列表', object({ categories: array(ref('Category')) }));
operation('get', '/products', '商品', '在售商品列表', object({ products: array(ref('Product')) }), { query: filters });
operation('get', '/products/{id}', '商品', '在售商品详情', ref('Product'), { errors: [404] });
operation('get', '/admin/dashboard', '商品管理', '营销数据统计', object({ metrics: object({ paidOrderCount: int, totalSales: num, productCount: int, activeProductCount: int, lowStockCount: int, customerCount: int }), recentOrders: array(object({ order_no: str, total: num, status: str, created_at: str })) }), { auth: 'admin' });
operation('get', '/admin/products', '商品管理', '所有商品列表', object({ products: array(ref('Product')) }), { auth: 'admin', query: { ...filters, status: { ...str, enum: ['active', 'inactive'] } } });
operation('post', '/admin/products', '商品管理', '新增商品', object({ product: ref('Product') }), { auth: 'admin', body: ref('ProductInput'), errors: [400], status: 201, description: 'isActive 默认 true。' });
operation('patch', '/admin/products/{id}', '商品管理', '编辑商品', object({ product: ref('Product') }), { auth: 'admin', body: ref('ProductInput'), errors: [400, 404], description: '须提交完整商品字段；isActive 省略时会下架。cover 省略时保留原封面。' });
operation('patch', '/admin/products/{id}/status', '商品管理', '商品上下架', ref('Ok'), { auth: 'admin', body: object({ isActive: bool }), errors: [404] });
operation('get', '/cart', '购物车', '当前购物车', object({ items: array(ref('CartItem')) }), { auth: 'customer' });
operation('post', '/cart', '购物车', '添加商品（累加数量）', ref('Ok'), { auth: 'customer', body: object({ productId: int, quantity: { ...int, minimum: 1, default: 1 } }, ['productId']), errors: [400, 404] });
operation('patch', '/cart/{productId}', '购物车', '设置商品数量', ref('Ok'), { auth: 'customer', body: object({ quantity: { ...int, minimum: 1 } }), errors: [400, 404] });
operation('delete', '/cart/{productId}', '购物车', '移除商品', ref('Ok'), { auth: 'customer' });
operation('get', '/addresses', '地址', '当前用户地址列表', object({ addresses: array(ref('Address')) }), { auth: 'customer' });
operation('post', '/addresses', '地址', '新增地址', object({ address: ref('Address') }), { auth: 'customer', body: ref('AddressInput'), errors: [400] });
operation('patch', '/addresses/{id}', '地址', '更新地址', object({ address: ref('Address') }), { auth: 'customer', body: ref('AddressInput'), errors: [400, 404], description: '须提交完整收货信息；isDefault 省略时为 false。' });
operation('delete', '/addresses/{id}', '地址', '删除地址', ref('Ok'), { auth: 'customer', errors: [404], description: '删除默认地址后会自动选择剩余地址为默认地址。' });
operation('post', '/checkout', '订单', '结算购物车并模拟支付', object({ order: object({ id: int, orderNo: str }) }), { auth: 'customer', body: object({ addressId: int }), errors: [400], description: '立即创建已支付订单、扣减库存并清空购物车。没有真实支付。地址无效、购物车为空、商品下架或库存不足时返回 400。' });
operation('get', '/orders', '订单', '当前用户订单列表', object({ orders: array(ref('Order')) }), { auth: 'customer' });
operation('get', '/orders/{id}', '订单', '订单详情', object({ order: ref('Order'), items: array(ref('OrderItem')) }), { auth: 'customer', errors: [404] });
export const openapi = {
  openapi: '3.0.3',
  info: { title: '微光集市 API', version: '1.0.0', description: '商城与管理后台接口。先执行对应登录接口，再调试受保护接口；浏览器自动携带 Cookie，无需在 Authorize 中手填。固定验证码 1234。写入操作会修改当前环境数据。' },
  // Relative to openapi.json, preserving reverse-proxy deployment prefixes.
  servers: [{ url: './', description: '当前环境 API' }],
  tags: ['系统', '用户认证', '商品', '购物车', '地址', '订单', '管理员认证', '商品管理'].map((name) => ({ name })),
  paths, components: { schemas, securitySchemes: {
    customer: { type: 'apiKey', in: 'cookie', name: 'demo_session' },
    admin: { type: 'apiKey', in: 'cookie', name: 'demo_admin_session' },
  } },
};

export const swaggerHtml = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>微光集市 API 文档</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
</head><body><div id="swagger-ui"></div>
<p id="fallback">正在加载接口文档。若无法加载 Swagger UI，请访问 <a id="spec">OpenAPI JSON</a>。</p>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin="anonymous"></script>
<script>
const apiBase = new URL(location.pathname.replace(/\\/docs\\/?$/, '/') , location.origin);
const specUrl = new URL('openapi.json', apiBase).href;
document.getElementById('spec').href = specUrl;
if (window.SwaggerUIBundle) {
  window.ui = SwaggerUIBundle({ url: specUrl, dom_id: '#swagger-ui', deepLinking: true, withCredentials: true, validatorUrl: null });
  document.getElementById('fallback').hidden = true;
}
</script></body></html>`;
