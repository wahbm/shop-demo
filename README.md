# 微光集市：稳定电商自动化测试 Demo

一个可本地运行、也可部署到阿里云 ECS 的中文商城，用于演示 UI 自动化测试。项目不请求原教学站点或任何商品服务，因此不会触发外部限流。

## 架构

- React + Vite：商城单页应用与测试定位契约。
- Hono：`/api/*` 认证、商品、购物车、地址和订单接口。
- MariaDB：ECS 生产环境的共享数据库；`server/schema.mysql.sql` 创建商城所需结构与固定教学数据。

本地开发仍使用 Cloudflare Worker/D1 模拟环境；ECS 生产环境由 Nginx 提供静态资源，并将 API 转发到受 systemd 管理的 Hono 服务。

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
- 当前功能：管理员登录、营销数据统计、商品搜索筛选、新增/编辑商品、上下架与库存管理。新增商品时可上传 JPG、PNG、WEBP 或 GIF 封面，表单会先本地预览，保存时上传到 CloudBase PG Storage 的 `public-assets` Bucket。

商品封面上传需要先复制 `.env.example` 为 `.env`，填写 CloudBase 项目 ID，并确认 `public-assets` Bucket 的安全域名、CORS 和对象策略已配置。前端只保存随机对象路径和文件元数据，不保存临时下载 URL；未配置 CloudBase 时仍可使用本地预览，但保存带封面的商品会提示配置错误。

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
- 管理后台商品：`admin-products-nav`、`admin-product-search`、`admin-add-product`、`admin-product-create-frame`、`admin-close-product-frame`、`admin-product-row-{id}`、`admin-edit-product-{id}`、`admin-product-name`、`admin-product-category`、`admin-product-price`、`admin-product-stock`、`admin-product-emoji`、`admin-product-description`、`admin-save-product`

同时保留了清晰的中文按钮和标签，示例也演示了语义定位与 `data-testid` 的组合使用。

## API 概览

所有接口均在 `/api` 下：认证（`/auth/*`）、分类和商品（`/categories`、`/products`）、购物车（`/cart`）、地址（`/addresses`）、结算（`/checkout`）和订单（`/orders`）。支付是立即返回“已支付”的本地模拟操作；没有真实支付、外部登录或远程商品资源。

## 部署到阿里云 ECS

生产发布地址为 `http://<ECS 公网 IP>/ww/shop-demo/`。Nginx 提供前端资源并转发 `/ww/shop-demo/api/` 到本机 `127.0.0.1:8788`；MariaDB 只监听本机。首次初始化使用 `server/schema.mysql.sql` 导入演示数据。

仓库中的 [deploy workflow](.github/workflows/deploy.yml) 会在推送到 `main` 或手动触发时构建前端、上传应用，并重启 `shop-demo` 服务。它依赖组织级 Variables：`DEPLOY_HOST`、`DEPLOY_PORT`、`DEPLOY_USER`、`DEPLOY_KNOWN_HOSTS`，组织级 Secret：`SSH_PRIVATE_KEY`，以及本仓库 Variables 中唯一的 `DEPLOY_PATH=/opt/ww/shop-demo`。
