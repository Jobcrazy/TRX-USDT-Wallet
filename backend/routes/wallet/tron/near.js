const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const auth = require("../../../common/auth");
const utils = require("../../../common/utils");
const errorCode = require("../../../common/errorCode");
const { checkPwd } = require("../../../common/payPwd");
const { checkOtp } = require("../../../common/otp");
const redis = require("../../../common/redis");
const Wallet = require("../../../model/wallet");
const tron = require("../../../blockchains/tron");
const near = require("../../../blockchains/tron/nearIntent");

const QUOTE_TTL_SECONDS = 180;
const CLAIM_TTL_SECONDS = 600;
const WALLET_LOCK_SECONDS = 120;
const RELEASE_LOCK = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

router.post("/estimate", auth, async (req, res) => {
    try {
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({ where: { address: req.body.address, userId: user.id } });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const inst = tron.getTronWeb(wallet.privateKey);
        const data = await near.quote(req.body.direction, wallet.address, req.body.amount);
        const { fee } = await near.depositTransaction(inst, wallet.address, data, false);
        const id = crypto.randomUUID();
        const ttl = Math.min(QUOTE_TTL_SECONDS,
            Math.floor((Date.parse(data.result.quote.deadline) - Date.now() - 90000) / 1000));
        if (ttl <= 0) return utils.SendError(res, errorCode.error_quote_expired);
        await redis.set(`near:quote:${id}`, JSON.stringify({ userId: user.id, walletId: wallet.id, data }), "EX", ttl);
        return utils.SendResult(res, { quoteId: id, ...near.publicQuote(data, fee) });
    } catch (error) {
        console.error("1Click estimate failed", error.message);
        return utils.SendError(res, error?.type ? error : errorCode.error_near_unavailable);
    }
});

router.post("/submit", auth, async (req, res) => {
    let broadcastStarted = false;
    try {
        const user = await utils.GetCurUser(req);
        if (!(await checkPwd(user, req.body.password)) ||
            (user.secret && user.secret.length && !(await checkOtp(user.id, user.secret, req.body.code))))
            return utils.SendError(res, errorCode.error_credential);
        if (typeof req.body.quoteId !== "string" || !/^[0-9a-f-]{36}$/.test(req.body.quoteId))
            return utils.SendError(res, errorCode.error_form);
        const key = `near:quote:${req.body.quoteId}`;
        const raw = await redis.get(key);
        if (!raw) return utils.SendError(res, errorCode.error_quote_expired);
        const saved = JSON.parse(raw);
        const wallet = await Wallet.findOne({ where: { id: saved.walletId, userId: user.id } });
        if (!wallet || saved.userId !== user.id || wallet.address !== req.body.address)
            return utils.SendError(res, errorCode.error_address);
        if (Date.parse(saved.data.result.quote.deadline) <= Date.now() + 90000)
            return utils.SendError(res, errorCode.error_quote_expired);
        const minOut = saved.data.result.quote.minAmountOut;
        if (typeof req.body.minAmountOut !== "string" || req.body.minAmountOut !== minOut)
            return utils.SendError(res, errorCode.error_form);
        const claimKey = `near:claim:${req.body.quoteId}`;
        const owner = crypto.randomUUID();
        const claimed = await redis.set(claimKey, owner, "EX", CLAIM_TTL_SECONDS, "NX");
        if (claimed !== "OK") return utils.SendError(res, errorCode.error_near_duplicate);
        const walletKey = `near:wallet:${user.id}:${wallet.id}`;
        let walletClaimed = false;
        try {
            walletClaimed = await redis.set(walletKey, owner, "EX", WALLET_LOCK_SECONDS, "NX") === "OK";
            if (!walletClaimed) return utils.SendError(res, errorCode.error_near_duplicate);
            const inst = tron.getTronWeb(wallet.privateKey);
            const { signed } = await near.depositTransaction(inst, wallet.address, saved.data);
            broadcastStarted = true;
            const broadcast = await inst.trx.sendRawTransaction(signed);
            if (!broadcast.result) {
                return utils.SendError(res, errorCode.error_near_uncertain);
            }
            const txid = broadcast.txid || signed.txID;
            await near.notifyDeposit(saved.data.result.quote.depositAddress, txid);
            return utils.SendResult(res, { txid });
        } finally {
            if (!broadcastStarted) {
                await redis.eval(RELEASE_LOCK, 1, claimKey, owner);
                if (walletClaimed) await redis.eval(RELEASE_LOCK, 1, walletKey, owner);
            }
        }
    } catch (error) {
        console.error("1Click submit failed", error.message);
        return utils.SendError(res, broadcastStarted ? errorCode.error_near_uncertain :
            error?.type ? error : errorCode.error_near_unavailable);
    }
});

module.exports = router;
