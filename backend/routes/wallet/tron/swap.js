const express = require("express");
const router = express.Router();
const otplib = require("otplib");
const Decimal = require("decimal.js");
const utils = require("../../../common/utils");
const auth = require("../../../common/auth");
const errorCode = require("../../../common/errorCode");
const tronWeb = require("../../../blockchains/tron");
const Wallet = require("../../../model/wallet");
const swapFactory = require("../../../blockchains/tron/sunswap/factory");
const swapPool = require("../../../blockchains/tron/sunswap/pool");
const swapRouter = require("../../../blockchains/tron/sunswap/router");
const usdt = require("../../../blockchains/tron/tokens/usdt");

const MAX_RESULT_SIZE_IN_TX = 75;

router.post("/trx2usdt", auth, async (req, res, next) => {
    try {
        const address = req.body.address;
        const amount = req.body.amount;
        if (!address || !amount)
            return utils.SendError(res, errorCode.error_lack_param);
        // 检查密码和secret
        const user = await utils.GetCurUser(req);
        if (
            user.password &&
            user.password.length &&
            req.body.password != user.password
        ) {
            return utils.SendError(res, errorCode.error_credential);
        }
        if (
            user.secret &&
            user.secret.length &&
            !otplib.authenticator.check(req.body.code, user.secret)
        ) {
            return utils.SendError(res, errorCode.error_credential);
        }
        // 兑换
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        // 工厂合同(用于取得Pool合同)
        const factoryContract = tronWebInst.contract(
            swapFactory,
            tronWeb.getConfig().sunswap.factory
        );
        // 路由合同
        const routerContract = tronWebInst.contract(
            swapRouter,
            tronWeb.getConfig().sunswap.router
        );
        // 计算能兑换的个数
        const amountIn = BigInt(tronWebInst.toSun(amount));
        const amountsOut = await routerContract.methods
            .getAmountsOut(amountIn, [
                tronWeb.getConfig().tokens.wtrx,
                tronWeb.getConfig().tokens.usdt,
            ])
            .call();
        const amountOutMin = BigInt(
            Decimal(amountsOut.amounts[1])
                .mul(Decimal(0.99).toFixed(0))
                .toString()
        );
        // 发起兑换
        const functionSelector =
            "swapExactETHForTokens(uint256,address[],address,uint256)";
        const parameter = [
            {
                type: "uint256",
                value: amountOutMin,
            }, // amountOutMin
            {
                type: "address[]",
                value: [
                    tronWeb.getConfig().tokens.wtrx,
                    tronWeb.getConfig().tokens.usdt,
                ],
            }, // path
            {
                type: "address",
                value: address,
            }, // recipient
            {
                type: "uint256",
                value: Math.floor(Date.now() / 1000) + 3600,
            }, // deadline
        ];
        const tx = await tronWebInst.transactionBuilder.triggerSmartContract(
            tronWeb.getConfig().sunswap.router,
            functionSelector,
            {
                callValue: amountIn,
            },
            parameter
        );
        const signedTx = await tronWebInst.trx.sign(tx.transaction);
        // 广播交易到区块链上
        const broadcast = await tronWebInst.trx.sendRawTransaction(signedTx);
        if (broadcast.result)
            return utils.SendResult(res, {
                txid: broadcast.txid,
            });
        else return utils.SendError(res, errorCode.error_transaction);
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/trx2usdt/estimate", auth, async (req, res, next) => {
    try {
        const address = req.body.address;
        const amount = req.body.amount;
        if (!address || !amount)
            return utils.SendError(res, errorCode.error_lack_param);
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        // 工厂合同(用于取得Pool合同)
        const factoryContract = tronWebInst.contract(
            swapFactory,
            tronWeb.getConfig().sunswap.factory
        );
        // 路由合同
        const routerContract = tronWebInst.contract(
            swapRouter,
            tronWeb.getConfig().sunswap.router
        );
        // 计算能兑换的个数
        const amountIn = BigInt(tronWebInst.toSun(amount));
        const amountsOut = await routerContract.methods
            .getAmountsOut(amountIn, [
                tronWeb.getConfig().tokens.wtrx,
                tronWeb.getConfig().tokens.usdt,
            ])
            .call();
        const amountOutMin = BigInt(
            Decimal(amountsOut.amounts[1])
                .mul(Decimal(0.99).toFixed(0))
                .toString()
        );
        // 发起兑换
        const functionSelector =
            "swapExactETHForTokens(uint256,address[],address,uint256)";
        const parameter = [
            {
                type: "uint256",
                value: amountOutMin,
            }, // amountOutMin
            {
                type: "address[]",
                value: [
                    tronWeb.getConfig().tokens.wtrx,
                    tronWeb.getConfig().tokens.usdt,
                ],
            }, // path
            {
                type: "address",
                value: address,
            }, // recipient
            {
                type: "uint256",
                value: Math.floor(Date.now() / 1000) + 3600,
            }, // deadline
        ];
        const tx = await tronWebInst.transactionBuilder.triggerConstantContract(
            tronWeb.getConfig().sunswap.router,
            functionSelector,
            {
                callValue: amountIn,
            },
            parameter
        );
        const signedTx = await tronWebInst.trx.sign(tx.transaction);

        // 获取目前链上的参数
        let cost = BigInt(0);
        const resources = await tronWebInst.trx.getAccountResources(address);
        const bwLeft =
            (resources.freeNetLimit ? resources.freeNetLimit : 0) -
            (resources.freeNetUsed ? resources.freeNetUsed : 0);
        const enLeft =
            (resources.EnergyLimit ? resources.EnergyLimit : 0) -
            (resources.EnergyUsed ? resources.EnergyUsed : 0);
        const chainParams = await tronWebInst.trx.getChainParameters();
        const bwPrice = chainParams.find(
            (param) => param.key === "getTransactionFee"
        ).value;
        const energyFee = chainParams.find(
            (param) => param.key === "getEnergyFee"
        ).value;

        // 计算交易的长度
        let sigLen = 0;
        for (let i = 0; i < signedTx.signature.length; i++) {
            sigLen += signedTx.signature[i].length / 2;
        }
        const tsLen =
            signedTx.raw_data_hex.length / 2 + sigLen + MAX_RESULT_SIZE_IN_TX;

        // 计算带宽消耗，如果发送方的可用带宽不够，则烧掉TRX作为交易费
        if (bwLeft < tsLen) {
            cost += BigInt(tsLen * bwPrice);
        }

        // 计算所需的能量价格，如果有能量，则优先从能量扣减
        if (enLeft < tx.energy_used) {
            cost += BigInt((tx.energy_used - enLeft) * energyFee);
        }

        return utils.SendResult(res, {
            amount: tronWebInst.fromSun(amountOutMin),
            cost: tronWebInst.fromSun(cost),
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/usdt2trx", auth, async (req, res, next) => {
    try {
        const address = req.body.address;
        const amount = req.body.amount;
        if (!address || !amount)
            return utils.SendError(res, errorCode.error_lack_param);
        // 检查密码和secret
        const user = await utils.GetCurUser(req);
        if (
            user.password &&
            user.password.length &&
            req.body.password != user.password
        ) {
            return utils.SendError(res, errorCode.error_credential);
        }
        if (
            user.secret &&
            user.secret.length &&
            !otplib.authenticator.check(req.body.code, user.secret)
        ) {
            return utils.SendError(res, errorCode.error_credential);
        }

        // 兑换
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);

        // 看看授权额度是否足够
        const usdtContract = tronWebInst.contract(
            usdt,
            tronWeb.getConfig().tokens.usdt
        );
        const amountIn = BigInt(tronWebInst.toSun(amount));
        const balance = await usdtContract.methods.balanceOf(address).call();
        if (balance < amountIn)
            return utils.SendError(res, errorCode.error_balance);
        const allowance = await usdtContract.methods
            .allowance(address, tronWeb.getConfig().sunswap.router)
            .call();
        if (allowance.remaining < amountIn) {
            return utils.SendError(res, errorCode.error_approve);
        }

        // 计算能兑换的个数
        const routerContract = tronWebInst.contract(
            swapRouter,
            tronWeb.getConfig().sunswap.router
        );
        const amountsOut = await routerContract.methods
            .getAmountsOut(amountIn, [
                tronWeb.getConfig().tokens.usdt,
                tronWeb.getConfig().tokens.wtrx,
            ])
            .call();
        const amountOutMin = BigInt(
            Decimal(amountsOut.amounts[1])
                .mul(Decimal(0.99).toFixed(0))
                .toString()
        );

        // 进行兑换
        const functionSelector =
            "swapExactTokensForETH(uint256,uint256,address[],address,uint256)";
        const parameter = [
            {
                type: "uint256",
                value: amountIn,
            }, // amountIn
            {
                type: "uint256",
                value: amountOutMin,
            }, // amountOutMin
            {
                type: "address[]",
                value: [
                    tronWeb.getConfig().tokens.usdt,
                    tronWeb.getConfig().tokens.wtrx,
                ],
            }, // path
            {
                type: "address",
                value: address,
            }, // recipient
            {
                type: "uint256",
                value: Math.floor(Date.now() / 1000) + 3600,
            }, // deadline
        ];
        const tx = await tronWebInst.transactionBuilder.triggerSmartContract(
            tronWeb.getConfig().sunswap.router,
            functionSelector,
            {},
            parameter
        );
        const signedTx = await tronWebInst.trx.sign(tx.transaction);

        // 广播交易到区块链上
        const broadcast = await tronWebInst.trx.sendRawTransaction(signedTx);
        if (broadcast.result)
            return utils.SendResult(res, {
                txid: broadcast.txid,
            });
        else return utils.SendError(res, errorCode.error_transaction);
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/usdt2trx/estimate", auth, async (req, res, next) => {
    try {
        const address = req.body.address;
        const amount = req.body.amount;
        if (!address || !amount)
            return utils.SendError(res, errorCode.error_lack_param);
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);

        // 看看授权额度是否足够
        const usdtContract = tronWebInst.contract(
            usdt,
            tronWeb.getConfig().tokens.usdt
        );
        const amountIn = BigInt(tronWebInst.toSun(amount));
        const balance = await usdtContract.methods.balanceOf(address).call();
        if (balance < amountIn)
            return utils.SendError(res, errorCode.error_balance);
        const allowance = await usdtContract.methods
            .allowance(address, tronWeb.getConfig().sunswap.router)
            .call();
        if (allowance.remaining < amountIn) {
            return utils.SendError(res, errorCode.error_approve);
        }

        // 计算能兑换的个数
        const routerContract = tronWebInst.contract(
            swapRouter,
            tronWeb.getConfig().sunswap.router
        );
        const amountsOut = await routerContract.methods
            .getAmountsOut(amountIn, [
                tronWeb.getConfig().tokens.usdt,
                tronWeb.getConfig().tokens.wtrx,
            ])
            .call();
        const amountOutMin = BigInt(
            Decimal(amountsOut.amounts[1])
                .mul(Decimal(0.99).toFixed(0))
                .toString()
        );

        // 进行兑换
        const functionSelector =
            "swapExactTokensForETH(uint256,uint256,address[],address,uint256)";
        const parameter = [
            {
                type: "uint256",
                value: amountIn,
            }, // amountIn
            {
                type: "uint256",
                value: amountOutMin,
            }, // amountOutMin
            {
                type: "address[]",
                value: [
                    tronWeb.getConfig().tokens.usdt,
                    tronWeb.getConfig().tokens.wtrx,
                ],
            }, // path
            {
                type: "address",
                value: address,
            }, // recipient
            {
                type: "uint256",
                value: Math.floor(Date.now() / 1000) + 3600,
            }, // deadline
        ];
        const tx = await tronWebInst.transactionBuilder.triggerConstantContract(
            tronWeb.getConfig().sunswap.router,
            functionSelector,
            {},
            parameter
        );
        const signedTx = await tronWebInst.trx.sign(tx.transaction);

        // 获取目前链上的参数
        let cost = BigInt(0);
        const resources = await tronWebInst.trx.getAccountResources(address);
        const bwLeft =
            (resources.freeNetLimit ? resources.freeNetLimit : 0) -
            (resources.freeNetUsed ? resources.freeNetUsed : 0);
        const enLeft =
            (resources.EnergyLimit ? resources.EnergyLimit : 0) -
            (resources.EnergyUsed ? resources.EnergyUsed : 0);
        const chainParams = await tronWebInst.trx.getChainParameters();
        const bwPrice = chainParams.find(
            (param) => param.key === "getTransactionFee"
        ).value;
        const energyFee = chainParams.find(
            (param) => param.key === "getEnergyFee"
        ).value;

        // 计算交易的长度
        let sigLen = 0;
        for (let i = 0; i < signedTx.signature.length; i++) {
            sigLen += signedTx.signature[i].length / 2;
        }
        const tsLen =
            signedTx.raw_data_hex.length / 2 + sigLen + MAX_RESULT_SIZE_IN_TX;

        // 计算带宽消耗，如果发送方的可用带宽不够，则烧掉TRX作为交易费
        if (bwLeft < tsLen) {
            cost += BigInt(tsLen * bwPrice);
        }

        // 计算所需的能量价格，如果有能量，则优先从能量扣减
        if (enLeft < tx.energy_used) {
            cost += BigInt((tx.energy_used - enLeft) * energyFee);
        }

        return utils.SendResult(res, {
            amount: tronWebInst.fromSun(amountOutMin),
            cost: tronWebInst.fromSun(cost),
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
