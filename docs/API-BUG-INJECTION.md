# 临时接口故障注入记录

> 仅用于本次接口测试。当前分支 `codex/api-bug-injection` 包含以下故意注入的故障；测试完成后必须恢复到无故障版本并重新部署。不要把本分支作为正式版本长期保留。

## 注入范围

| 接口 | 正常行为 | 本次测试行为 | 验证重点 |
| --- | --- | --- | --- |
| `POST /api/auth/logout` | 清除 `demo_session` Cookie，后续受保护接口返回 401 | 返回成功但不清除 Cookie，原会话仍可访问 | 退出后调用 `/api/cart` 或 `/api/auth/me` |
| `POST /api/auth/register` | 写入 `users` 并可用新账号登录 | 返回成功但不写入用户数据；新账号登录失败 | 注册后用相同手机号和密码登录 |
| `GET /api/categories` | 分类字段包含 `name` | 将 `name` 重命名为 `label` | 检查响应字段和前端分类名称 |
| `GET /api/products` | 支持 `q`、`categoryId` 筛选并返回完整商品字段 | 忽略 `categoryId`，每个商品只返回 `id`、`name` | 对比带/不带 `categoryId` 的结果及字段集合 |
| `GET /api/products/{id}` | 返回完整商品详情 | 只返回 `id`、`name` | 检查详情响应是否缺少价格、库存等字段 |
| `GET /api/cart` | 返回当前用户的全部购物车商品 | 固定最多返回 1 条 | 先加入 2 个商品，再查询列表 |
| `POST /api/cart` | 同一商品再次添加时累加数量 | 同一商品再次添加时覆盖为本次数量 | 连续添加同一商品并检查数量 |
| `PATCH /api/cart/{productId}` | 将数量设置为请求体中的 `quantity` | 将请求体中的 `quantity` 作为增量 | 修改前后比较数量差值 |
| `DELETE /api/cart/{productId}` | 删除指定商品并返回成功 | 返回成功但不删除商品 | 删除后再次查询购物车 |

## 实现位置

- ECS API：`server/app.ts`
- ECS 入口：`server/index.ts`
- 部署路径：`/ww/shop-demo/`
- 数据库：ECS 上的 MariaDB；本次故障不会修改 schema 或种子数据文件

每处故障代码旁都有 `TEST BUG` 注释，便于测试结束后逐项恢复。恢复时应删除本文件，并按“恢复清单”还原 `server/app.ts` 中对应逻辑，随后运行类型检查、构建和接口测试，再提交和部署正式修复。

## 恢复清单

1. 恢复登出时的 `deleteCookie(c, 'demo_session', { path: '/' })`。
2. 恢复注册用户的 `INSERT`、查询新用户和设置会话 Cookie。
3. 让分类接口继续返回数据库的 `name` 字段。
4. 恢复公开商品的 `categoryId` 筛选和完整商品投影。
5. 恢复商品详情返回完整商品对象。
6. 移除购物车结果的 `.slice(0, 1)`。
7. 恢复添加商品时的 `quantity = quantity + ?`。
8. 恢复修改商品数量为直接设置 `quantity = ?`。
9. 恢复购物车删除 SQL。

完成恢复后，确认部署服务使用的是修复提交，并重新验证上述 9 个接口的正常行为。
