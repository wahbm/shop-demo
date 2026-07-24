# 微光集市：稳定电商自动化测试 Demo

一个可本地运行、也可部署到 Cloudflare Workers 的中文商城，用于演示 UI 自动化测试。项目不请求原教学站点或任何商品服务，因此不会触发外部限流。

## 架构

- React + Vite：商城单页应用与测试定位契约。
- Cloudflare Worker + Hono：`/api/*` 认证、商品、购物车、地址和订单接口。
- Cloudflare D1：持久化 SQLite 语义数据库；`migrations/0001_init.sql` 同时创建结构与固定教学数据。

生产环境由同一个 Worker 同时提供静态前端与 API，不需要常驻服务器。D1 是托管且持久化的，因此不会出现 Vercel 本地 SQLite 文件丢失的问题。

## 运行

```bash
pnpm install
pnpm db:reset
pnpm dev
```

打开 `http://127.0.0.1:5173`。本地 API 运行在 Cloudflare Worker 模拟环境（端口 `8787`），数据存储在本地 D1 模拟数据库中。要恢复到固定的初始状态，执行：

```bash
pnpm db:reset
```

演示账号为 `13800000000` / `Demo1234`，登录和注册页的固定验证码均为 `1234`。

## 管理后台 Demo

访问 `http://127.0.0.1:5173/admin` 可进入管理后台。它和商城共用同一个 Worker 和 D1 数据库，因此商品、库存和订单数据会即时同步。

- 管理员账号：`13900000001` / `Admin1234`
- 固定验证码：`1234`
- 当前功能：管理员登录、营销数据统计、商品搜索筛选、新增/编辑商品、上下架与库存管理。

管理后台使用独立的管理员会话和 `/api/admin/*` 接口；普通商城账号不能访问这些接口。

## 自动化示例

```bash
pnpm test
```

该命令先重置数据，再运行 Playwright 示例。首次运行 Playwright 时，如本机尚未安装浏览器，可执行：

```bash
pnpm exec playwright install chromium
```

示例覆盖失败登录、搜索、加购、地址选择、模拟支付、订单查询与未登录拦截。

## 测试定位契约

关键交互均提供可长期使用的 `data-testid`：

- 认证：`phone-input`、`password-input`、`captcha-input`、`login-submit`、`register-submit`
- 搜索与商品：`search-input`、`search-submit`、`category-{id}`、`product-card-{id}`、`add-to-cart`
- 购物车和结算：`cart-link`、`cart-item-{productId}`、`cart-quantity-{productId}`、`checkout-button`、`address-{id}`、`pay-button`
- 订单：`order-{orderNo}`
- 管理后台登录：`admin-phone-input`、`admin-password-input`、`admin-captcha-input`、`admin-login-submit`
- 管理后台商品：`admin-products-nav`、`admin-product-search`、`admin-add-product`、`admin-product-row-{id}`、`admin-edit-product-{id}`、`admin-product-name`、`admin-product-category`、`admin-product-price`、`admin-product-stock`、`admin-product-emoji`、`admin-product-description`、`admin-save-product`

同时保留了清晰的中文按钮和标签，示例也演示了语义定位与 `data-testid` 的组合使用。

## API 概览

所有接口均在 `/api` 下：认证（`/auth/*`）、分类和商品（`/categories`、`/products`）、购物车（`/cart`）、地址（`/addresses`）、结算（`/checkout`）和订单（`/orders`）。支付是立即返回“已支付”的本地模拟操作；没有真实支付、外部登录或远程商品资源。

## 部署到 Cloudflare

部署前需要一个 Cloudflare 账户。首次部署按以下顺序执行：

```bash
# 1. 浏览器登录 Cloudflare
pnpm exec wrangler login

# 2. 创建远程 D1 数据库；命令会输出 database_id
pnpm cf:db:create
```

把输出的 `database_id` 替换到 `wrangler.jsonc` 的占位值 `00000000-0000-0000-0000-000000000000`，然后执行：

```bash
# 3. 仅首次：创建表并导入固定演示数据
pnpm cf:db:migrate

# 4. 构建并发布 Worker、前端静态资源和 API
pnpm cf:deploy
```

`pnpm cf:deploy` 会输出公开的 `*.workers.dev` 地址。可在 Cloudflare Dashboard 的 Worker 域名设置中绑定自有域名；以后代码更新只需再次执行 `pnpm cf:deploy`，数据库迁移只有新增迁移文件时才需运行 `pnpm cf:db:migrate`。

若希望由 Codex 直接部署，请提供或在终端配置以下信息：Cloudflare API Token、Account ID、期望的 Worker 名称，以及是否绑定已有域名。Token 需能管理该账户的 Workers 和 D1；不要把 Token 写入仓库或提交到 Git。

## GitHub 自动部署

仓库中的 [deploy workflow](.github/workflows/deploy.yml) 会在推送到 `main` 时先应用尚未执行的 D1 迁移，再发布 Worker。启用前在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中创建：

- `CLOUDFLARE_API_TOKEN`：具有 Workers 与 D1 写入权限的 Cloudflare API Token。
- `CLOUDFLARE_ACCOUNT_ID`：目标 Cloudflare Account ID。

Secrets 配置完成后，每次推送到 `main` 都会自动部署；也可以在 Actions 页面手动运行 **Deploy to Cloudflare**。
