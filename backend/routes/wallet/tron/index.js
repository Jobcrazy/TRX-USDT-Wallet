const express = require("express");
const hdkey = require("hdkey");
const auth = require("../../../common/auth");
const utils = require("../../../common/utils");
const tronWeb = require("../../../blockchains/tron");
const usdt = require("../../../blockchains/tron/tokens/usdt");
const Wallet = require("../../../model/wallet");
const errorCode = require("../../../common/errorCode");
const router = express.Router();

router.post("/create", auth, async (req, res, next) => {
    try {
        const user = await utils.GetCurUser(req);
        if (!user.seed || !user.seed.length)
            return utils.SendError(res, errorCode.error_no_seed);
        // 获取这个用户有多少个Tron地址
        const count = await Wallet.count({
            where: {
                blockchain: "tron",
                userId: user.id,
            },
        });
        if (count >= 100)
            return utils.SendError(res, errorCode.error_too_many_wallet);
        const hdnode = hdkey.fromMasterSeed(Buffer.from(user.seed, "hex"));
        const path = `m/44'/195'/0'/0/${count}`;
        const key = hdnode.derive(path);
        const privateKey = key.privateKey.toString("hex");
        // 从私钥生成钱包地址
        const address = tronWeb.getTronWeb().address.fromPrivateKey(privateKey);
        if (address === false) return utils.SendError(res);
        // 保存到数据库
        const wallet = await user.createWallet({
            alias: req.body.alias,
            blockchain: "tron",
            address,
            account: 0,
            address_index: count,
            privateKey: key.privateKey.toString("hex"),
            publicKey: key.publicKey.toString("hex"),
        });
        utils.SendResult(res, { wallet });
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/rename", auth, async (req, res, next) => {
    try {
        const user = await utils.GetCurUser(req);
        let wallet = Wallet.update(
            { alias: req.body.alias },
            {
                where: {
                    id: req.body.id,
                    userId: user.id,
                },
            }
        );
        utils.SendResult(res);
    } catch (error) {
        utils.SendError(res, error);
    }
});

router.post("/list", auth, async (req, res, next) => {
    try {
        let page = req.body.page ? req.body.page : 1;
        let limit = req.body.limit ? req.body.limit : 20;
        let offset = (page - 1) * limit;

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

// 查询子账户的信息
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
