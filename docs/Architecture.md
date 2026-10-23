# 项目架构

妙蛙钱包是运行在 Telegram 内的 TRON 钱包：Vue 前端通过 HTTP API 访问 Express 后端，后端在 MySQL 保存用户和钱包数据，通过 TronWeb 与 TRON 节点交互；Redis 用于短期安全与兑换状态。当前实现由服务端保存助记词、种子和私钥，并在服务端签名交易。

## 组件与依赖

```text
Telegram Mini App
  └─ frontend/（Vue 3、Vite、Vant）
       └─ /api HTTP 请求
            └─ backend/（Express）
                 ├─ MySQL（Sequelize：用户、钱包）
                 ├─ Redis（临时 2FA、兑换报价与提交状态）
                 ├─ TRON 节点 / TronGrid（余额、历史、交易广播、SunSwap V2）
                 └─ NEAR Intents 1Click（兑换报价与转入地址）
```

| 位置 | 职责 |
| --- | --- |
| `frontend/src/main.js`、`router/`、`views/` | 初始化 Telegram SDK、界面与路由；页面发起业务请求。 |
| `frontend/src/common/request.js`、`session.js` | 统一 API 请求与内存中的会话 token；页面另用 `localStorage` 保存用户、所选钱包等界面状态。 |
| `backend/server.js`、`app.js` | 同步数据模型后启动 HTTP 服务，注册中间件和 `/api` 路由。 |
| `backend/routes/user.js`、`wallet/` | 校验身份和交易授权，处理用户、钱包、TRX、USDT、质押及兑换请求。 |
| `backend/common/`、`model/` | 认证、金额/手续费计算、数据库与 Redis 连接，以及 User/Wallet 模型。 |
| `backend/blockchains/tron/` | TronWeb 客户端、手续费估算、USDT 与 SunSwap 合约接口，以及 NEAR Intents 1Click 报价与转入交易构造。 |

## 核心调用链

1. **登录**：前端读取 Telegram 启动参数，将原始 `initData` 发送到 `POST /api/user/login`；后端验证 Telegram 签名，按 Telegram 用户 ID 查找或创建用户，并发放有有效期的 token。后续受保护路由通过请求头 `Token` 查询和校验该 token。
2. **建钱包与重置**：`POST /api/wallet/create` 校验助记词，将助记词和生成的种子写入 User；`POST /api/wallet/tron/create` 从种子按 TRON 派生路径生成账户，把地址和密钥写入 Wallet。User 与 Wallet 为一对多关系。`POST /api/wallet/reset` 删除该用户的钱包，再清除种子和助记词。
3. **链上操作**：前端向 `/api/wallet/tron/{trx,usdt,stake,swap,near}` 请求余额、历史、估算或提交交易；路由按当前用户查找钱包，提交交易时校验支付密码及已启用的 2FA，在服务端用私钥签名并向 TRON 节点广播。兑换可选择 SunSwap V2 或 NEAR Intents 1Click；只有 SunSwap 的 USDT → TRX 需要合约授权。具体流程见 [SunSwap](swap/SunSwap.md) 与 [NEAR Intents](swap/NearIntents.md)。

## 状态与运行边界

- MySQL 是用户、会话 token、助记词/种子和钱包密钥的持久存储；Redis 保存 2FA、NEAR Intents 报价和重复提交控制等临时状态。前端 token 仅保存在运行时内存；刷新受保护页面时重新完成 Telegram 登录，并返回刷新前的路由。
- `backend/config/default.json` 按 `PHASE=production` 选择生产配置，否则使用开发配置，包含数据库、Redis、Telegram 和 TRON 参数；其中的凭据与链地址属于部署配置，不应复制进架构文档。
- 开发时 Vite 将 `/api` 代理到本地 `3000` 端口；后端默认监听 `PORT` 或 `3000`。数据模型启动时通过 `sequelize.sync({ alter: true })` 同步。生产环境需提供同源 API 路由，并将前端页面路径回退到 `index.html`，以支持直接打开或刷新页面。
