const express = require("express");
const config = require("config");
const auth = require("../../../common/auth");
const utils = require("../../../common/utils");
const errorCode = require("../../../common/errorCode");
const Wallet = require("../../../model/wallet");
const bsc = require("../../../blockchains/bsc");

const router = express.Router();

router.post("/create", auth, async (req, res) => {
    try {
        const user = await utils.GetCurUser(req);
        if (!user.seed) return utils.SendError(res, errorCode.error_no_seed);
        const count = await Wallet.count({ where: { blockchain: "bsc", userId: user.id } });
        if (count >= config.get("wallet.max_per_user"))
            return utils.SendError(res, errorCode.error_too_many_wallet);
        const { HDKey } = await import("@scure/bip32");
        const key = HDKey.fromMasterSeed(Buffer.from(user.seed, "hex"))
            .derive(`m/44'/60'/0'/0/${count}`);
        const privateKey = Buffer.from(key.privateKey).toString("hex");
        const address = new bsc.Wallet(`0x${privateKey}`).address;
        const wallet = await user.createWallet({
            alias: req.body.alias,
            blockchain: "bsc",
            address,
            account: 0,
            address_index: count,
            privateKey,
            publicKey: Buffer.from(key.publicKey).toString("hex"),
        });
        const result = wallet.toJSON();
        delete result.privateKey;
        delete result.publicKey;
        utils.SendResult(res, { wallet: result });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/list", auth, async (req, res) => {
    try {
        const page = Number(req.body.page || 1);
        const requestedLimit = Number(req.body.limit || config.get("wallet.list_page_size"));
        if (!Number.isSafeInteger(page) || page < 1 ||
            !Number.isSafeInteger(requestedLimit) || requestedLimit < 1)
            return utils.SendError(res, errorCode.error_form);
        const limit = Math.min(requestedLimit, config.get("wallet.list_page_size_max"));
        const offset = (page - 1) * limit;
        if (!Number.isSafeInteger(offset)) return utils.SendError(res, errorCode.error_form);
        const user = await utils.GetCurUser(req);
        if (!user.seed) return utils.SendError(res, errorCode.error_no_seed);
        const { count, rows } = await Wallet.findAndCountAll({
            attributes: { exclude: ["publicKey", "privateKey"] },
            where: { blockchain: "bsc", userId: user.id },
            offset,
            limit,
            order: [["address_index", "ASC"]],
        });
        utils.SendResult(res, { count, walles: rows });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/rename", auth, async (req, res) => {
    try {
        const user = await utils.GetCurUser(req);
        const [updated] = await Wallet.update({ alias: req.body.alias }, {
            where: { id: req.body.id, blockchain: "bsc", userId: user.id },
        });
        if (!updated) return utils.SendError(res, errorCode.error_address);
        utils.SendResult(res);
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
