# 妙蛙钱包

**妙蛙钱包** 是一个 Telegram 小程序，它是基于 TRON 网络的数字钱包，支持基于 TRON 的两种代币：TRX 和 USDT。您可以用 **Telegram** 搜索并添加 **`@TuWalletBot`** 来体验它。

## 起因

有感于 TRON 的中文开发文档匮乏，而用于实现分布式代币兑换的 SunSwap 文档处处是错误(远比 UniSwap 差)，所以我开发并开源了这个项目，以此为社区做点贡献。

## 关于本仓库

本仓库是 **妙蛙钱包** 的源码，它包含了后端和前端的如下逻辑:

1. 用新的助记词创建钱包
2. 用老的助记词恢复钱包
3. 创建不限量的子账户
4. 发送/接受 TRX/USDT 代币
5. 质押/解押 TRX/USDT 代币
6. 调用 SunSwap V2 进行 TRX/USDT 代币互转
7. 可启用支付密码
8. 可启用双因素验证
9. 可启用手机生物识别(指纹/面容)

任何人都可以把 **妙蛙钱包** 部署到自己的服务器上。您也可以修改/复制其源码，使其变成一个单机运行的数字钱包 App。

## 如何运行

### 后端

**妙蛙钱包** 的后端代码在 backend 文件夹内，它是基于 Node.js 的。您需要提前安装 Node.js，MySQL 和 Redis 才能将其运行起来。

在安装并配置好上述软件后，请修改配置文件(config/default.json)。这个文件包含数据库密码，TronGrid 的 API Key 等关键信息。

TronGrid 是 TRON 官方提供的 RPC 节点，**妙蛙钱包** 的后端源码会请求 TronGrid 来执行交易，因此您需要注册 TronGrid 并获取一个 Key。如果您不想使用 TronGrid，也可以自行搜索相关资料，部署一个 TRON 的全节点，但这对新手来说较为麻烦。

因 **妙蛙钱包** 默认只支持 Telegram 登录，所以您还需要去创建一个 Telegram 的 Bot，并拿到 Bot 的 API Key。

接下来只需要进入 backend 文件夹，执行`npm install`和`npm start`就可以把后端执行起来。

### 前端

**妙蛙钱包** 的前端代码在 frontend 文件夹内。它基于 Vite 和 Vue3，其界面主要使用了 Vant.js，对国内开发者会相对友好。

因 **妙蛙钱包** 默认只支持 Telegram 登录。您还需要基于之前创建的 Telegram Bot 创建一个小程序(Mini App)，并配置为前端代码运行后的页面地址。

接下来只需要进入 frontend 文件夹，执行`npm install`和`npm start`就可以把前端代码执行起来。

打开您创建的小程序，就会访问到您的前端页面。Telegram 会把用户信息发送到后端，全自动注册用户并提示创建钱包。

## 相关链接

以下是您可能需要参考的资料

1. [Telegram 小程序 SDK 文档](https://docs.telegram-mini-apps.com/zh/)
2. [SunSwap V2 文档](https://docs-zh.sun.io/kai-fa-zhe/dui-huan/sunswap-dui-huan-jian-jie)
3. [TronGrid 官网](https://www.trongrid.io/)
4. [获取 TRX 测试代币](https://nileex.io/join/getJoinPage)
