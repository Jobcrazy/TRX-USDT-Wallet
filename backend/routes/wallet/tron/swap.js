const express = require("express");
const router = express.Router();
const { checkOtp } = require("../../../common/otp");
const { minOut, protectedMinOut } = require("../../../common/quote");
const utils = require("../../../common/utils");
const auth = require("../../../common/auth");
const errorCode = require("../../../common/errorCode");
const { checkPwd } = require("../../../common/payPwd");
const { positiveSun, positiveUnits, formatUnits } = require("../../../common/amount");
const { getTokenDecimals } = require("../../../blockchains/tron/tokenDecimals");
const config = require("config");
const { estimateFee } = require("../../../blockchains/tron/estimateFee");
const tronWeb = require("../../../blockchains/tron");
const Wallet = require("../../../model/wallet");
const swapRouter = require("../../../blockchains/tron/sunswap/router");
const usdt = require("../../../blockchains/tron/tokens/usdt");

const usdtDecimals = (inst) => getTokenDecimals(inst, tronWeb.getConfig().tokens.usdt, tronWeb.getConfig().rpc_url);
const positiveUsdt = async (value, inst) => positiveUnits(value, await usdtDecimals(inst));
const swapDeadline = () => Math.floor(Date.now() / 1000) + config.get("wallet.swap_deadline_seconds");

router.post("/trx2usdt", auth, async (req, res, next) => {
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
        // Swap
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        // Router contract
        const routerContract = tronWebInst.contract(
            swapRouter,
            tronWeb.getConfig().sunswap.router
        );
        // Calculate the expected output amount
        const amountIn = positiveSun(amount);
        const amountsOut = await routerContract.methods
            .getAmountsOut(amountIn, [
                tronWeb.getConfig().tokens.wtrx,
                tronWeb.getConfig().tokens.usdt,
            ])
            .call();
        if (!req.body.minAmountOut)
            return utils.SendError(res, errorCode.error_lack_param);
        const userMin = await positiveUsdt(req.body.minAmountOut, tronWebInst);
        const amountOutMin = protectedMinOut(amountsOut.amounts[1], userMin);
        if (amountOutMin === null)
            return utils.SendError(res, errorCode.error_transaction);
        // Build the swap transaction
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
                value: swapDeadline(),
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
        // Router contract
        const routerContract = tronWebInst.contract(
            swapRouter,
            tronWeb.getConfig().sunswap.router
        );
        // Calculate the expected output amount
        const amountIn = positiveSun(amount);
        const amountsOut = await routerContract.methods
            .getAmountsOut(amountIn, [
                tronWeb.getConfig().tokens.wtrx,
                tronWeb.getConfig().tokens.usdt,
            ])
            .call();
        const amountOutMin = minOut(amountsOut.amounts[1]);
        // Build the swap transaction
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
                value: swapDeadline(),
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

        // Estimate fees using current chain parameters and account resources.
        const cost = await estimateFee(tronWebInst, address, signedTx, {
            energyUsed: tx.energy_used,
        });

        return utils.SendResult(res, {
            amount: formatUnits(amountOutMin, await usdtDecimals(tronWebInst)),
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

        // Swap
        const wallet = await Wallet.findOne({
            where: { address: address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);

        // Check whether the allowance is sufficient
        const usdtContract = tronWebInst.contract(
            usdt,
            tronWeb.getConfig().tokens.usdt
        );
        const amountIn = await positiveUsdt(amount, tronWebInst);
        const balance = await usdtContract.methods.balanceOf(address).call();
        if (balance < amountIn)
            return utils.SendError(res, errorCode.error_balance);
        const allowance = await usdtContract.methods
            .allowance(address, tronWeb.getConfig().sunswap.router)
            .call();
        if (allowance.remaining < amountIn) {
            return utils.SendError(res, errorCode.error_approve);
        }

        // Calculate the expected output amount
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
        if (!req.body.minAmountOut)
            return utils.SendError(res, errorCode.error_lack_param);
        const userMin = positiveSun(req.body.minAmountOut);
        const amountOutMin = protectedMinOut(amountsOut.amounts[1], userMin);
        if (amountOutMin === null)
            return utils.SendError(res, errorCode.error_transaction);

        // Execute the swap
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
                value: swapDeadline(),
            }, // deadline
        ];
        const tx = await tronWebInst.transactionBuilder.triggerSmartContract(
            tronWeb.getConfig().sunswap.router,
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

        // Check whether the allowance is sufficient
        const usdtContract = tronWebInst.contract(
            usdt,
            tronWeb.getConfig().tokens.usdt
        );
        const amountIn = await positiveUsdt(amount, tronWebInst);
        const balance = await usdtContract.methods.balanceOf(address).call();
        if (balance < amountIn)
            return utils.SendError(res, errorCode.error_balance);
        const allowance = await usdtContract.methods
            .allowance(address, tronWeb.getConfig().sunswap.router)
            .call();
        if (allowance.remaining < amountIn) {
            return utils.SendError(res, errorCode.error_approve);
        }

        // Calculate the expected output amount
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
        const amountOutMin = minOut(amountsOut.amounts[1]);

        // Execute the swap
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
                value: swapDeadline(),
            }, // deadline
        ];
        const tx = await tronWebInst.transactionBuilder.triggerConstantContract(
            tronWeb.getConfig().sunswap.router,
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
            amount: tronWebInst.fromSun(amountOutMin),
            cost: tronWebInst.fromSun(cost),
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
