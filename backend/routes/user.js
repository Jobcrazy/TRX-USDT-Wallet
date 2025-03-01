const express = require("express");
const router = express.Router();
const config = require("config");
const otplib = require("otplib");
const tgInitData = require("@telegram-apps/init-data-node");
const auth = require("../common/auth");
const errorCode = require("../common/errorCode");
const utils = require("../common/utils");
const redis = require("../common/redis");
const User = require("../model/user");
const Wallet = require("../model/wallet");

let config_telegram = null;
if (process.env.PHASE === "production")
    config_telegram = config.get("production.telegram");
else config_telegram = config.get("development.telegram");

router.post("/login", async function (req, res, next) {
    try {
        if (
            process.env.NODE_ENV === "production" &&
            tgInitData.validate(req.body.initData, config_telegram.token)
        )
            return utils.SendError(res, errorCode.error_credential);
        const initData = tgInitData.parse(req.body.initData);
        let user = await User.findOne({
            attributes: { exclude: ["mnenomic"] },
            include: {
                model: Wallet,
                attributes: { exclude: ["publicKey", "privateKey"] },
            },
            where: {
                username: initData.user.id,
            },
        });
        if (!user) {
            // 注册新用户
            user = await User.create({
                username: initData.user.id,
                token: utils.CalcStringMD5(
                    initData.user.id + config_telegram.token
                ),
            });
            user = JSON.parse(JSON.stringify(user));
            user.inited = false;
            user.wallets = [];
            return utils.SendResult(res, user);
        }
        user = JSON.parse(JSON.stringify(user));
        if (!user.seed) {
            user.inited = false;
        } else {
            user.inited = true;
            delete user.seed;
        }
        if (user.password && user.password.length) {
            delete user.password;
            user.hasPassword = true;
        } else {
            user.hasPassword = false;
        }
        if (user.secret && user.secret.length) {
            delete user.secret;
            user.enable2fa = true;
        } else {
            user.enable2fa = false;
        }
        utils.SendResult(res, user);
    } catch (error) {
        console.log(error);
        utils.SendError(res, error);
    }
});

router.post("/password", auth, async function (req, res, next) {
    try {
        let user = await utils.GetCurUser(req);
        if (user.password && user.password != req.body.old_password) {
            return utils.SendError(res, errorCode.error_pay_password);
        }
        await User.update(
            {
                password:
                    req.body.password && req.body.password.length
                        ? req.body.password
                        : null,
            },
            {
                where: {
                    token: req.headers.token,
                },
            }
        );
        utils.SendResult(res);
    } catch (error) {
        console.log(error);
        utils.SendError(res, error);
    }
});

/*
router.post("/mnemonic", auth, async function (req, res, next) {
    try {
        let user = await utils.GetCurUser(req);
        if (
            !user.password ||
            (user.password && user.password != req.body.password)
        ) {
            return utils.SendError(res, errorCode.error_pay_password);
        }
        utils.SendResult(res, { mnemonic: user.mnemonic });
    } catch (error) {
        console.log(error);
        utils.SendError(res, error);
    }
});
*/

router.post("/verify", auth, async function (req, res, next) {
    try {
        let user = await utils.GetCurUser(req);
        utils.SendResult(res, {
            verified: user.password === req.body.password,
        });
    } catch (error) {
        console.log(error);
        utils.SendError(res, error);
    }
});

router.post("/get_2fa", auth, async function (req, res, next) {
    try {
        const user = await utils.GetCurUser(req);
        if (user.secret && user.secret.length)
            return utils.SendError(res, errorCode.error_secret);
        let key = `user:${user.id}:secret`;
        let secret = await redis.get(key);
        if (!secret || !secret.length)
            secret = otplib.authenticator.generateSecret();
        const appName =
            process.env.PHASE === "production" ? "TUWallet" : "TUWaTest";
        const otpauthUrl = otplib.authenticator.keyuri(
            user.username,
            appName,
            secret
        );
        await redis.set(key, secret, "EX", 3 * 60);
        utils.SendResult(res, {
            otpauthUrl,
        });
    } catch (error) {
        console.log(error);
        utils.SendError(res, error);
    }
});

router.post("/enable_2fa", auth, async function (req, res, next) {
    try {
        const user = await utils.GetCurUser(req);
        if (user.secret && user.secret.length)
            return utils.SendError(res, errorCode.error_secret);
        let key = `user:${user.id}:secret`;
        let secret = await redis.get(key);
        if (!secret || !secret.length)
            return utils.SendError(res, errorCode.error_invalid_secret);
        if (otplib.authenticator.check(req.body.code, secret)) {
            await User.update(
                { secret },
                {
                    where: {
                        id: user.id,
                    },
                }
            );
            return utils.SendResult(res);
        }
        return utils.SendError(res, errorCode.error_invalid_secret);
    } catch (error) {
        console.log(error);
        utils.SendError(res, error);
    }
});

router.post("/disable_2fa", auth, async function (req, res, next) {
    try {
        const user = await utils.GetCurUser(req);
        if (!user.secret || !user.secret.length) return utils.SendResult(res);
        if (otplib.authenticator.check(req.body.code, user.secret)) {
            await User.update(
                { secret: null },
                {
                    where: {
                        id: user.id,
                    },
                }
            );
            return utils.SendResult(res);
        }
        return utils.SendError(res, errorCode.error_invalid_secret);
    } catch (error) {
        console.log(error);
        utils.SendError(res, error);
    }
});

router.post("/get_security", auth, async function (req, res, next) {
    try {
        const user = await utils.GetCurUser(req);
        const password = user.password && user.password.length ? true : false;
        const secret = user.secret && user.secret.length ? true : false;
        return utils.SendResult(res, {
            password,
            secret,
        });
    } catch (error) {
        console.log(error);
        utils.SendError(res, error);
    }
});

module.exports = router;
