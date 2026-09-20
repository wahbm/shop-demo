# 临时接口故障注入记录

当前 ECS 测试版本保留以下 8 个故意注入的接口故障。注册接口已恢复正常：会写入用户数据、设置登录 Cookie，并可使用新账号登录。

| 接口 | 当前测试行为 |
| --- | --- |
| `POST /api/auth/logout` | 返回成功但不清除用户登录 Cookie |
| `GET /api/categories` | 把 `name` 字段改为 `label` |
| `GET /api/products` | 忽略 `categoryId`，只返回 `id`、`name` |
| `GET /api/products/{id}` | 只返回 `id`、`name` |
| `GET /api/cart` | 固定最多返回 1 条数据 |
| `POST /api/cart` | 重复添加同一商品时覆盖数量，不累加 |
| `PATCH /api/cart/{productId}` | 将请求数量作为增量，不是目标数量 |
| `DELETE /api/cart/{productId}` | 返回成功但不移除商品 |

实现位置：`server/app.ts`。每个故障旁都有 `TEST BUG` 注释；后续恢复测试版本时只需按原始需求逐项还原这些代码，并删除本记录。
