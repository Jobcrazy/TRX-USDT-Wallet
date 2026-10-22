const express = require("express");
const { BigNumber } = require("tronweb");
const { checkOtp } = require("../../../../common/otp");
const auth = require("../../../../common/auth");
const utils = require("../../../../common/utils");
const tronWeb = require("../../../../blockchains/tron");
const Wallet = require("../../../../model/wallet");
const errorCode = require("../../../../common/errorCode");
const { checkPwd } = require("../../../../common/payPwd");
const { positiveSun } = require("../../../../common/amount");
const { showTrx } = require("../../../../common/trxTx");
const { estimateFee } = require("../../../../blockchains/tron/estimateFee");
const config = require("config");

const router = express.Router();

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
        let amount = positiveSun(req.body.amount);
        if (
            !tronWebInst.isAddress(fromAddress) ||
            !tronWebInst.isAddress(toAddress)
        )
            return utils.SendError(res, errorCode.error_invalid_address);

        // Check whether the recipient account is active.
        const toAccount = await tronWebInst.trx.getAccount(toAddress);
        const activatesAccount = !Object.keys(toAccount).length;
        const transaction = await tronWebInst.transactionBuilder.sendTrx(
            toAddress,
            amount,
            fromAddress
        );
        const signedTransaction = await tronWebInst.trx.sign(transaction);

        // Account activation uses on-chain creation fees and its dedicated bandwidth rule.
        const cost = await estimateFee(tronWebInst, fromAddress, signedTransaction, {
            kind: "trx", activatesAccount,
        });

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
        // Transfer
        const wallet = await Wallet.findOne({
            where: { address: fromAddress, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        const amount = positiveSun(req.body.amount);
        if (
            !tronWebInst.isAddress(fromAddress) ||
            !tronWebInst.isAddress(toAddress)
        )
            return utils.SendError(res, errorCode.error_invalid_address);

        // Build and sign the transaction
        const transaction = await tronWebInst.transactionBuilder.sendTrx(
            toAddress,
            amount,
            fromAddress
        );
        const signedTransaction = await tronWebInst.trx.sign(transaction);

        // Broadcast the transaction
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
        const addressHex = tronWeb.getTronWeb(wallet.privateKey).address.toHex(address);
        const txs = (await tronWeb.getHistory(address, fingerprint, config.get("wallet.trx_history_page_size"))).data;
        if (!txs.success) throw new Error("Failed to load TRX history");
        const transactions = (txs.data || []).filter((tx) =>
            showTrx(tx, addressHex)
        );
        return utils.SendResult(res, {
            fingerprint: txs.meta?.fingerprint,
            transactions,
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
