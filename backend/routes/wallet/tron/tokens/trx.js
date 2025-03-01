const express = require("express");
const { BigNumber } = require("tronweb");
const otplib = require("otplib");
const auth = require("../../../../common/auth");
const utils = require("../../../../common/utils");
const tronWeb = require("../../../../blockchains/tron");
const Wallet = require("../../../../model/wallet");
const errorCode = require("../../../../common/errorCode");

const router = express.Router();
const MAX_RESULT_SIZE_IN_TX = 69;

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
        const balance = await tronWebInst.trx.getBalance(address);
        const result = {
            token: "trx",
            address,
            balance: tronWebInst.fromSun(balance),
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
        const chainParams = await tronWebInst.trx.getChainParameters();
        const bwPrice = chainParams.find(
            (param) => param.key === "getTransactionFee"
        ).value;

        // 计算转账费用
        let cost = BigInt(0);
        const toAccount = await tronWebInst.trx.getAccount(toAddress);
        if (!Object.keys(toAccount).length) {
            // 如果对方地址没有激活，发送方需要支付1TRX的激活费用
            // 并消耗0.1RTX抵扣带宽消耗的费用，不扣除已有带宽
            cost += BigInt(tronWebInst.toSun(1.1));
        }

        // 创建交易数据并签名
        const transaction = await tronWebInst.transactionBuilder.sendTrx(
            toAddress,
            amount,
            fromAddress
        );
        const signedTransaction = await tronWebInst.trx.sign(transaction);

        // 计算交易的长度
        let sigLen = 0;
        for (let i = 0; i < signedTransaction.signature.length; i++) {
            sigLen += signedTransaction.signature[i].length / 2;
        }
        const tsLen =
            signedTransaction.raw_data_hex.length / 2 +
            sigLen +
            MAX_RESULT_SIZE_IN_TX;

        // 计算交易费用，如果发送方的可用带宽不够，则烧掉TRX作为交易费
        if (bwLeft < tsLen) {
            cost += BigInt(tsLen * bwPrice);
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
        const amount = BigInt(tronWebInst.toSun(req.body.amount));
        if (
            !tronWebInst.isAddress(fromAddress) ||
            !tronWebInst.isAddress(toAddress)
        )
            return utils.SendError(res, errorCode.error_invalid_address);

        // 创建交易数据并签名交易
        const transaction = await tronWebInst.transactionBuilder.sendTrx(
            toAddress,
            amount,
            fromAddress
        );
        const signedTransaction = await tronWebInst.trx.sign(transaction);

        // 广播交易到区块链上
        const broadcast = await tronWebInst.trx.sendRawTransaction(
            signedTransaction
        );
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
        let txs = (await tronWeb.getHistory(address, fingerprint, 20)).data;
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

module.exports = router;
