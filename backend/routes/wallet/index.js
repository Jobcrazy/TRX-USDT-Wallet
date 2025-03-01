const express = require("express");
const router = express.Router();
const bip39 = require("bip39");
const HDKey = require("hdkey");
const utils = require("../../common/utils");
const auth = require("../../common/auth");
const errorCode = require("../../common/errorCode");
const User = require("../../model/user");
const Wallet = require("../../model/wallet");

router.post("/create", auth, async (req, res, next) => {
    try {
        const user = await utils.GetCurUser(req);
        if (user && user.seed && user.seed.length)
            return utils.SendError(res, errorCode.error_seed);
        const mnemonic = req.body.mnemonic
            .replace(/[\r\n]+/g, " ") // 将换行符替换为空格
            .replace(/\s+/g, " ") // 将多个空格替换为一个空格
            .trim(); // 去除首尾多余的空格
        if (!mnemonic) return utils.SendError(res, errorCode.error_lack_param);
        if (!bip39.validateMnemonic(mnemonic))
            return utils.SendError(res, errorCode.error_mnenomic);
        const seed = (await bip39.mnemonicToSeed(mnemonic)).toString("hex");
        await User.update(
            {
                seed,
                mnemonic,
            },
            {
                where: {
                    id: user.id,
                },
            }
        );
        utils.SendResult(res);
    } catch (error) {
        utils.SendError(res, error);
    }
});

// 删除全部子账户并清空seed和mnemonic
router.post("/reset", auth, async (req, res, next) => {
    try {
        let user = await utils.GetCurUser(req);
        if (user.password != req.body.password)
            return utils.SendError(res, errorCode.error_credential);
        // 删除全部关联的子账户
        await Wallet.destroy({ where: { userId: user.id } });
        // 清空seed和mnemonic
        await User.update(
            { seed: null, mnemonic: null },
            { where: { id: user.id } }
        );
        utils.SendResult(res);
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
