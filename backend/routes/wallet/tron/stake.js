const express = require("express");
const router = express.Router();
const { checkOtp } = require("../../../common/otp");
const Decimal = require("decimal.js");
const utils = require("../../../common/utils");
const auth = require("../../../common/auth");
const errorCode = require("../../../common/errorCode");
const { checkPwd } = require("../../../common/payPwd");
const { positiveSun } = require("../../../common/amount");
const tronWeb = require("../../../blockchains/tron");
const Wallet = require("../../../model/wallet");
const { estimateFee } = require("../../../blockchains/tron/estimateFee");

router.post("/stake", auth, async (req, res, next) => {
    try {
        const type = req.body.type;
        const purpose = req.body.purpose;
        const address = req.body.address;
        let amount = req.body.amount;
        if (!type || !purpose || !address || !amount)
            return utils.SendError(res, errorCode.error_lack_param);
        if (!["freeze", "unfreeze"].includes(type) || !["ENERGY", "BANDWIDTH"].includes(purpose))
            return utils.SendError(res, errorCode.error_form);
        // Verify the payment password and 2FA secret
        const user = await utils.GetCurUser(req);
        if (!(await checkPwd(user, req.body.password))) {
            return utils.SendError(res, errorCode.error_credential);
        }
        if (
            user.secret &&
            user.secret.length &&
            !(await checkOtp(user.id, user.secret, req.body.code))
        ) {
            return utils.SendError(res, errorCode.error_credential);
        }

        // Stake or unstake
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        amount = positiveSun(amount);
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
        // Broadcast the transaction
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
        if (!["freeze", "unfreeze"].includes(type) || !["ENERGY", "BANDWIDTH"].includes(purpose))
            return utils.SendError(res, errorCode.error_form);
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        amount = positiveSun(amount);
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

        // Get current chain parameters
        const resources = await tronWebInst.trx.getAccountResources(address);
        const chainParams = await tronWebInst.trx.getChainParameters();
        const bwPrice = chainParams.find(
            (param) => param.key === "getTransactionFee"
        ).value;
        const energyFee = chainParams.find(
            (param) => param.key === "getEnergyFee"
        ).value;

        // Estimate bandwidth fees for this transaction.
        const cost = await estimateFee(tronWebInst, address, signedTx);

        // Calculate the gained or lost resource amount
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
