# 妙蛙钱包

[English](README.md)

妙蛙钱包是一个基于 TRON 网络的 Telegram 小程序，支持管理 TRX 和 USDT。您可以在 Telegram 中打开 [@TuWalletBot](https://t.me/TuWalletBot) 体验。

## 功能

- 使用新助记词创建钱包，或通过已有助记词恢复钱包。
- 创建多个钱包账户。
- 发送和接收 TRX、USDT。
- 质押和解押 TRX，获取 TRON 网络资源。
- 通过 SunSwap V2 兑换 TRX 和 USDT。
- 启用支付密码、双因素验证和设备生物识别。

本仓库包含 [`backend/`](backend/) 中的 Node.js 后端，以及 [`frontend/`](frontend/) 中基于 Vue 3、Vite 和 Vant 的前端。您可以将应用部署到自己的服务器，并根据需要修改源码。

## 快速开始

### 后端

1. 安装 Node.js、MySQL 和 Redis。
2. 创建 Telegram Bot 并获取 Token。如果使用 TronGrid 作为 TRON 节点服务，还需要获取 TronGrid API Key。
3. 在 [`backend/config/default.json`](backend/config/default.json) 中配置数据库、Telegram Bot 和 TRON 相关参数。请妥善保管凭据。
4. 安装依赖并启动服务：

   ```bash
   cd backend
   npm install
   npm start
   ```

### 前端

1. 为 Bot 创建 Telegram 小程序，并将小程序地址设置为前端页面的访问地址。
2. 安装依赖并启动 Vite 开发服务器：

   ```bash
   cd frontend
   npm install
   npm start
   ```

在 Telegram 中打开小程序即可访问钱包。

## 项目初衷

本项目希望为 TRON 开发者提供一份可参考的开源实现，尤其是 SunSwap 集成方面的示例。

## 相关资源

- [Telegram 小程序文档](https://docs.telegram-mini-apps.com/zh/)
- [SunSwap V2 文档](https://docs-zh.sun.io/kai-fa-zhe/dui-huan/sunswap-dui-huan-jian-jie)
- [TronGrid 官网](https://www.trongrid.io/)
- [获取 TRX 测试代币](https://nileex.io/join/getJoinPage)

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
