const express = require("express");
const config = require("config");
const otplib = require("otplib");
const Decimal = require("decimal.js");
const auth = require("../../../../common/auth");
const utils = require("../../../../common/utils");
const tronWeb = require("../../../../blockchains/tron");
const Wallet = require("../../../../model/wallet");
const usdt = require("../../../../blockchains/tron/tokens/usdt");
const errorCode = require("../../../../common/errorCode");
const router = express.Router();

const MAX_RESULT_SIZE_IN_TX = 75;
const usdtDecimal = BigInt(10 ** 6);

router.post("/balance", auth, async (req, res, next) => {
    try {
        let address = req.body.address;
        if (!address) return utils.SendError(res, errorCode.error_lack_param);
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        const usdtContract = tronWebInst.contract(
            usdt,
            tronWeb.getConfig().tokens.usdt
        );

        let balance = await usdtContract.methods.balanceOf(address).call();
        let result = {
            token: "usdt",
            address,
            balance: Decimal(balance).div(Decimal(usdtDecimal)).toString(),
        };
        utils.SendResult(res, result);
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/estimate", auth, async (req, res, next) => {
    try {
        let fromAddress = req.body.from;
        if (!fromAddress)
            return utils.SendError(res, errorCode.error_lack_param);
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address: fromAddress, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);

        let toAddress = req.body.to;
        let amount = BigInt(tronWebInst.toSun(req.body.amount));
        if (
            !tronWebInst.isAddress(fromAddress) ||
            !tronWebInst.isAddress(toAddress)
        )
            return utils.SendError(res, errorCode.error_invalid_address);

        // 获取目前链上的参数
        const resources = await tronWebInst.trx.getAccountResources(
            fromAddress
        );
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

        // 计算转账费用
        let cost = BigInt(0);
        const toAccount = await tronWebInst.trx.getAccount(toAddress);
        if (!Object.keys(toAccount).length) {
            // 如果对方地址没有激活，阻止发送避免损失
            return utils.SendError(res, errorCode.error_inactivated_account);
        }

        // 创建交易数据并签名交易
        const functionSelector = "transfer(address,uint256)";
        const parameter = [
            { type: "address", value: toAddress },
            { type: "uint256", value: amount },
        ];
        const tx = await tronWebInst.transactionBuilder.triggerConstantContract(
            tronWeb.getConfig().tokens.usdt,
            functionSelector,
            {},
            parameter
        );
        const signedTx = await tronWebInst.trx.sign(tx.transaction);

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
            cost: tronWebInst.fromSun(cost),
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/transfer", auth, async (req, res, next) => {
    try {
        let fromAddress = req.body.from;
        let toAddress = req.body.to;
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
        // 转账
        const wallet = await Wallet.findOne({
            where: { address: fromAddress, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        let amount = BigInt(req.body.amount) * usdtDecimal;
        if (
            !tronWebInst.isAddress(fromAddress) ||
            !tronWebInst.isAddress(toAddress)
        )
            return utils.SendError(res, errorCode.error_invalid_address);

        // 如果对方地址没有激活，阻止发送避免损失
        const toAccount = await tronWebInst.trx.getAccount(toAddress);
        if (!Object.keys(toAccount).length) {
            return utils.SendError(res, errorCode.error_inactivated_account);
        }

        // 创建交易数据并签名交易
        const functionSelector = "transfer(address,uint256)";
        const parameter = [
            { type: "address", value: toAddress },
            { type: "uint256", value: amount },
        ];
        const tx = await tronWebInst.transactionBuilder.triggerSmartContract(
            tronWeb.getConfig().tokens.usdt,
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

router.post("/history", auth, async (req, res, next) => {
    try {
        let address = req.body.address;
        let fingerprint = req.body.fingerprint;
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        let txs = (
            await tronWeb.getTRC20History(
                address,
                tronWeb.getConfig().tokens.usdt,
                fingerprint,
                20
            )
        ).data;
        if (txs.success) {
            return utils.SendResult(res, {
                fingerprint: txs.meta.fingerprint,
                transactions: txs.data,
            });
        }
        return utils.SendResult(res, {
            transactions: [],
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/allowance", auth, async (req, res, next) => {
    try {
        const address = req.body.address;
        if (!address) return utils.SendError(res, errorCode.error_lack_param);
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);

        const usdtContract = tronWebInst.contract(
            usdt,
            tronWeb.getConfig().tokens.usdt
        );
        const allowance = await usdtContract.methods
            .allowance(address, tronWeb.getConfig().sunswap.router)
            .call();
        return utils.SendResult(res, {
            amount: tronWebInst.fromSun(allowance.remaining),
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/approve", auth, async (req, res, next) => {
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
        // 授信
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        const amountIn = BigInt(tronWebInst.toSun(amount));
        const functionSelector = "approve(address,uint256)";
        const parameter = [
            {
                type: "address",
                value: tronWeb.getConfig().sunswap.router,
            }, // spender
            {
                type: "uint256",
                value: amountIn,
            }, // amount
        ];
        const tx = await tronWebInst.transactionBuilder.triggerSmartContract(
            tronWeb.getConfig().tokens.usdt,
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

router.post("/approve/estimate", auth, async (req, res, next) => {
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
        const amountIn = BigInt(tronWebInst.toSun(amount));
        const functionSelector = "approve(address,uint256)";
        const parameter = [
            {
                type: "address",
                value: tronWeb.getConfig().sunswap.router,
            }, // spender
            {
                type: "uint256",
                value: amountIn,
            }, // amount
        ];
        const tx = await tronWebInst.transactionBuilder.triggerConstantContract(
            tronWeb.getConfig().tokens.usdt,
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
            cost: tronWebInst.fromSun(cost),
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
