const express = require("express");
const { checkOtp } = require("../../../../common/otp");
const auth = require("../../../../common/auth");
const utils = require("../../../../common/utils");
const tronWeb = require("../../../../blockchains/tron");
const Wallet = require("../../../../model/wallet");
const usdt = require("../../../../blockchains/tron/tokens/usdt");
const errorCode = require("../../../../common/errorCode");
const { checkPwd } = require("../../../../common/payPwd");
const { positiveUnits, formatUnits } = require("../../../../common/amount");
const { getTokenDecimals } = require("../../../../blockchains/tron/tokenDecimals");
const config = require("config");
const { estimateFee } = require("../../../../blockchains/tron/estimateFee");
const router = express.Router();

const usdtDecimals = (inst) => getTokenDecimals(inst, tronWeb.getConfig().tokens.usdt, tronWeb.getConfig().rpc_url);
const positiveUsdt = async (value, inst) => positiveUnits(value, await usdtDecimals(inst));

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
            balance: formatUnits(balance, await usdtDecimals(tronWebInst)),
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
        if (
            !tronWebInst.isAddress(fromAddress) ||
            !tronWebInst.isAddress(toAddress)
        )
            return utils.SendError(res, errorCode.error_invalid_address);
        let amount = await positiveUsdt(req.body.amount, tronWebInst);

        // Check the recipient account status.
        const toAccount = await tronWebInst.trx.getAccount(toAddress);
        if (!Object.keys(toAccount).length) {
            // Reject transfers to inactive recipients to avoid losing tokens
            return utils.SendError(res, errorCode.error_inactivated_account);
        }

        // Build and sign the transaction
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

        // Estimate fees using current chain parameters and account resources.
        const cost = await estimateFee(tronWebInst, fromAddress, signedTx, {
            energyUsed: tx.energy_used,
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
        if (
            !tronWebInst.isAddress(fromAddress) ||
            !tronWebInst.isAddress(toAddress)
        )
            return utils.SendError(res, errorCode.error_invalid_address);
        let amount = await positiveUsdt(req.body.amount, tronWebInst);

        // Reject transfers to inactive recipients to avoid losing tokens
        const toAccount = await tronWebInst.trx.getAccount(toAddress);
        if (!Object.keys(toAccount).length) {
            return utils.SendError(res, errorCode.error_inactivated_account);
        }

        // Build and sign the transaction
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
                config.get("wallet.history_page_size")
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
            amount: formatUnits(allowance.remaining, await usdtDecimals(tronWebInst)),
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
        // Approve allowance
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        const amountIn = await positiveUsdt(amount, tronWebInst);
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
        const amountIn = await positiveUsdt(amount, tronWebInst);
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

        // Estimate fees using current chain parameters and account resources.
        const cost = await estimateFee(tronWebInst, address, signedTx, {
            energyUsed: tx.energy_used,
        });

        return utils.SendResult(res, {
            cost: tronWebInst.fromSun(cost),
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
