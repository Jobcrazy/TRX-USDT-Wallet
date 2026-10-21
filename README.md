# MiaoWa Wallet

[简体中文](README.zh-CN.md)

MiaoWa Wallet is a Telegram Mini App for managing TRX and USDT on the TRON network. To try it, find [@TuWalletBot](https://t.me/TuWalletBot) on Telegram.

## Features

- Create a wallet with a new recovery phrase or restore one from an existing phrase.
- Create multiple wallet accounts.
- Send and receive TRX and USDT.
- Stake and unstake TRX for TRON resources.
- Swap TRX and USDT through SunSwap V2.
- Enable a payment password, two-factor authentication, and device biometrics.

The repository contains the Node.js backend in [`backend/`](backend/) and the Vue 3, Vite, and Vant frontend in [`frontend/`](frontend/). You can deploy the app on your own server and adapt the source code to your needs.

## Getting started

### Backend

1. Install Node.js, MySQL, and Redis.
2. Set up a Telegram bot and obtain its token. Obtain a TronGrid API key if you use TronGrid as your TRON node provider.
3. Configure [`backend/config/default.json`](backend/config/default.json) with your database, Telegram bot, and TRON settings. Keep credentials private.
4. Install dependencies and start the server:

   ```bash
   cd backend
   npm install
   npm start
   ```

### Frontend

1. Create a Telegram Mini App for your bot and set its URL to the address where you serve the frontend.
2. Install dependencies and start the Vite development server:

   ```bash
   cd frontend
   npm install
   npm start
   ```

Open the Mini App in Telegram to access the wallet.

## Why this project exists

This project was created to share a working example with developers building on TRON, especially those looking for guidance on integrating SunSwap.

## Resources

- [Telegram Mini Apps documentation](https://docs.telegram-mini-apps.com/)
- [SunSwap V2 documentation](https://docs-zh.sun.io/kai-fa-zhe/dui-huan/sunswap-dui-huan-jian-jie)
- [TronGrid](https://www.trongrid.io/)
- [TRX test tokens](https://nileex.io/join/getJoinPage)

## License

This project is licensed under the [MIT License](LICENSE).
