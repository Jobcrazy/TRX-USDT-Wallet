const express = require("express");
const { formatUnits } = require("ethers");
const auth = require("../../../common/auth");
const { checkOtp } = require("../../../common/otp");
const { checkPwd } = require("../../../common/payPwd");
const { positiveUnits } = require("../../../common/amount");
const utils = require("../../../common/utils");
const errorCode = require("../../../common/errorCode");
const Wallet = require("../../../model/wallet");
const bsc = require("../../../blockchains/bsc");

const router = express.Router();

async function owned(req, address) {
    const user = await utils.GetCurUser(req);
    const wallet = await Wallet.findOne({
        where: { address, blockchain: "bsc", userId: user.id },
    });
    if (!wallet) throw errorCode.error_address;
    return { user, wallet };
}

async function details(kind, provider) {
    if (kind === "bnb") return { decimals: 18, contract: null };
    if (!["usdt", "intcb", "nvdab"].includes(kind)) throw errorCode.error_form;
    const contract = bsc.token(provider, kind);
    return { decimals: Number(await contract.decimals()), contract };
}

async function prepare(req, wallet, provider) {
    if (!["bnb", "usdt", "intcb", "nvdab"].includes(req.params.token))
        throw errorCode.error_form;
    if (!bsc.isAddress(req.body.to)) throw errorCode.error_invalid_address;
    const { decimals, contract } = await details(req.params.token, provider);
    const amount = positiveUnits(req.body.amount, decimals);
    const balance = contract ? await contract.balanceOf(wallet.address) :
        await provider.getBalance(wallet.address);
    if (balance < amount) throw errorCode.error_balance;
    const tx = contract ? await contract.transfer.populateTransaction(req.body.to, amount) :
        { to: req.body.to, value: amount };
    const gas = await provider.estimateGas({ ...tx, from: wallet.address });
    const fee = await provider.getFeeData();
    if (!fee.gasPrice) throw errorCode.error_transaction;
    const gasLimit = gas * 120n / 100n;
    const cost = gasLimit * fee.gasPrice;
    const native = await provider.getBalance(wallet.address);
    if (native < cost + (contract ? 0n : amount)) throw errorCode.error_balance;
    return { tx, gasLimit, gasPrice: fee.gasPrice, cost };
}

router.post("/:token/balance", auth, async (req, res) => {
    try {
        const { wallet } = await owned(req, req.body.address);
        const provider = bsc.provider();
        const { decimals, contract } = await details(req.params.token, provider);
        const balance = contract ? await contract.balanceOf(wallet.address) :
            await provider.getBalance(wallet.address);
        utils.SendResult(res, {
            token: req.params.token,
            address: wallet.address,
            balance: formatUnits(balance, decimals),
            decimals,
        });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/:token/estimate", auth, async (req, res) => {
    try {
        const { wallet } = await owned(req, req.body.from);
        const prepared = await prepare(req, wallet, bsc.provider());
        utils.SendResult(res, { cost: formatUnits(prepared.cost, 18) });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/:token/transfer", auth, async (req, res) => {
    try {
        const { user, wallet } = await owned(req, req.body.from);
        if (!(await checkPwd(user, req.body.password)) ||
            (user.secret && user.secret.length &&
                !(await checkOtp(user.id, user.secret, req.body.code))))
            return utils.SendError(res, errorCode.error_credential);
        const provider = bsc.provider();
        const prepared = await prepare(req, wallet, provider);
        const signer = new bsc.Wallet(`0x${wallet.privateKey}`, provider);
        const tx = await signer.sendTransaction({
            ...prepared.tx,
            gasLimit: prepared.gasLimit,
            gasPrice: prepared.gasPrice,
            chainId: bsc.getConfig().chain_id,
        });
        utils.SendResult(res, { txid: tx.hash });
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
