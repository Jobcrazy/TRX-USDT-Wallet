# SunSwap 兑换

SunSwap V2 是当前 TRX/USDT 同链兑换方式。后端按所选钱包签名并广播交易；接口返回交易哈希表示交易已提交，不代表链上最终确认。

## 调用流程

| 方向 | 预估 | 提交 | 链上调用 |
| --- | --- | --- | --- |
| TRX → USDT | `POST /api/wallet/tron/swap/trx2usdt/estimate` | `POST /api/wallet/tron/swap/trx2usdt` | `swapExactETHForTokens` |
| USDT → TRX | `POST /api/wallet/tron/swap/usdt2trx/estimate` | `POST /api/wallet/tron/swap/usdt2trx` | `swapExactTokensForETH` |

预估从 SunSwap Router 读取 `getAmountsOut`，按配置的滑点计算最低到账量，并估算 TRON 资源费用。提交时后端重新报价，要求当前报价满足页面传入的最低到账量，再构造交易；交易带有配置的截止时间。

USDT → TRX 需先向 SunSwap Router 授权足够的 USDT；授权额度查询、估算和提交分别位于 `/api/wallet/tron/usdt/allowance`、`/api/wallet/tron/usdt/approve/estimate`、`/api/wallet/tron/usdt/approve`。TRX → USDT 无此步骤。

## 边界

- 所有接口都验证登录 token 和钱包归属；提交兑换或授权时还校验已设置的支付密码及 2FA。
- 代币合约、SunSwap Router、滑点及截止时间从后端配置读取；TRX 使用 6 位精度，USDT 精度由合约查询。
- 前端提交成功后返回上一页并提示用户稍后刷新，不提供兑换结果页或订单历史。
