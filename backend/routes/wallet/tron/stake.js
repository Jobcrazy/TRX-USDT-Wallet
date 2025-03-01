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

router.post("/stake", auth, async (req, res, next) => {
    try {
        const type = req.body.type;
        const purpose = req.body.purpose;
        const address = req.body.address;
        let amount = req.body.amount;
        if (!type || !purpose || !address || !amount)
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

        // 开始质押或解押
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        amount = BigInt(tronWebInst.toSun(amount));
        let tx = null;
        if (type == "freeze")
            tx = await tronWebInst.transactionBuilder.freezeBalanceV2(
                amount,
                purpose,
                address
            );
        else if (type == "unfreeze")
            tx = await tronWebInst.transactionBuilder.unfreezeBalanceV2(
                amount,
                purpose,
                address
            );
        const signedTx = await tronWebInst.trx.sign(tx);
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

router.post("/estimate", auth, async (req, res, next) => {
    try {
        const type = req.body.type;
        const purpose = req.body.purpose;
        const address = req.body.address;
        let amount = req.body.amount;
        if (!type || !purpose || !address || !amount)
            return utils.SendError(res, errorCode.error_lack_param);
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        amount = BigInt(tronWebInst.toSun(amount));
        let tx = null;
        if (type == "freeze")
            tx = await tronWebInst.transactionBuilder.freezeBalanceV2(
                amount,
                purpose,
                address
            );
        else if (type == "unfreeze")
            tx = await tronWebInst.transactionBuilder.unfreezeBalanceV2(
                amount,
                purpose,
                address
            );
        const signedTx = await tronWebInst.trx.sign(tx);

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

        // 计算增加/减少的额度
        let benifit = 0;
        let deduct = 0;
        if (purpose == "ENERGY") {
            benifit = Decimal(amount)
                .div(Decimal(resources.TotalEnergyWeight))
                .mul(Decimal(resources.TotalEnergyLimit))
                .div(10 ** 6)
                .toFixed(0)
                .toString();
            deduct = Decimal(benifit)
                .mul(energyFee)
                .div(10 ** 6)
                .toFixed(2)
                .toString();
        } else if (purpose == "BANDWIDTH") {
            benifit = Decimal(amount)
                .div(Decimal(resources.TotalNetWeight))
                .mul(Decimal(resources.TotalNetLimit))
                .div(10 ** 6)
                .toFixed(0)
                .toString();
            deduct = Decimal(benifit)
                .mul(bwPrice)
                .div(10 ** 6)
                .toFixed(2)
                .toString();
        }
        return utils.SendResult(res, {
            benifit,
            deduct,
            cost: tronWebInst.fromSun(cost),
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
