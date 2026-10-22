const express = require("express");
const auth = require("../../../common/auth");
const utils = require("../../../common/utils");
const tronWeb = require("../../../blockchains/tron");
const Wallet = require("../../../model/wallet");
const errorCode = require("../../../common/errorCode");
const router = express.Router();
const config = require("config");

router.post("/create", auth, async (req, res, next) => {
    try {
        const user = await utils.GetCurUser(req);
        if (!user.seed || !user.seed.length)
            return utils.SendError(res, errorCode.error_no_seed);
        // Count the user’s TRON addresses
        const count = await Wallet.count({
            where: {
                blockchain: "tron",
                userId: user.id,
            },
        });
        if (count >= config.get("wallet.max_per_user"))
            return utils.SendError(res, errorCode.error_too_many_wallet);
        const { HDKey } = await import("@scure/bip32");
        const hdnode = HDKey.fromMasterSeed(Buffer.from(user.seed, "hex"));
        const path = `m/44'/195'/0'/0/${count}`;
        const key = hdnode.derive(path);
        const privateKey = Buffer.from(key.privateKey).toString("hex");
        // Derive the wallet address from the private key
        const address = tronWeb.getTronWeb().address.fromPrivateKey(privateKey);
        if (address === false) return utils.SendError(res);
        // Save to the database
        const wallet = await user.createWallet({
            alias: req.body.alias,
            blockchain: "tron",
            address,
            account: 0,
            address_index: count,
            privateKey,
            publicKey: Buffer.from(key.publicKey).toString("hex"),
        });
        const publicWallet = wallet.toJSON();
        delete publicWallet.privateKey;
        delete publicWallet.publicKey;
        utils.SendResult(res, { wallet: publicWallet });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/rename", auth, async (req, res, next) => {
    try {
        const user = await utils.GetCurUser(req);
        const [updated] = await Wallet.update(
            { alias: req.body.alias },
            {
                where: {
                    id: req.body.id,
                    userId: user.id,
                },
            }
        );
        if (!updated) return utils.SendError(res, errorCode.error_address);
        utils.SendResult(res);
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/list", auth, async (req, res, next) => {
    try {
        const page = Number(req.body.page || 1);
        const requestedLimit = Number(req.body.limit || config.get("wallet.list_page_size"));
        if (!Number.isSafeInteger(page) || page < 1 ||
            !Number.isSafeInteger(requestedLimit) || requestedLimit < 1)
            return utils.SendError(res, errorCode.error_form);
        const limit = Math.min(requestedLimit, config.get("wallet.list_page_size_max"));
        const offset = (page - 1) * limit;
        if (!Number.isSafeInteger(offset))
            return utils.SendError(res, errorCode.error_form);

        const user = await utils.GetCurUser(req);
        if (!user.seed || !user.seed.length)
            return utils.SendError(res, errorCode.error_no_seed);
        const { count, rows } = await Wallet.findAndCountAll({
            attributes: { exclude: ["publicKey", "privateKey"] },
            where: {
                blockchain: "tron",
                userId: user.id,
            },
            offset,
            limit,
            order: [["address_index", "ASC"]],
        });
        utils.SendResult(res, { count, walles: rows });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/resources", auth, async (req, res, next) => {
    try {
        let address = req.body.address;
        if (!address) return utils.SendError(res, errorCode.error_lack_param);
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        const resources = await tronWebInst.trx.getAccountResources(address);
        utils.SendResult(res, resources);
    } catch (error) {
        utils.SendError(res, error);
    }
});

// Get subaccount information
router.post("/account", auth, async (req, res, next) => {
    try {
        let address = req.body.address;
        if (!address) return utils.SendError(res, errorCode.error_lack_param);
        const user = await utils.GetCurUser(req);
        const wallet = await Wallet.findOne({
            where: { address, userId: user.id },
        });
        if (!wallet) return utils.SendError(res, errorCode.error_address);
        const tronWebInst = tronWeb.getTronWeb(wallet.privateKey);
        utils.SendResult(
            res,
            await tronWebInst.trx.getAccount(req.body.address)
        );
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
