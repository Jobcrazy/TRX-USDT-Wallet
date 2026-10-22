const express = require("express");
const router = express.Router();
const config = require("config");
const otplib = require("otplib");
const { checkOtp } = require("../common/otp");
const tgInitData = require("@telegram-apps/init-data-node");
const auth = require("../common/auth");
const errorCode = require("../common/errorCode");
const utils = require("../common/utils");
const redis = require("../common/redis");
const User = require("../model/user");
const Wallet = require("../model/wallet");
const { newSecret, hashSecret, verifySecret } = require("../common/bio");
const { newToken, sessionExpiresAt } = require("../common/session");
const { hashPwd, checkPwd } = require("../common/payPwd");

let config_telegram = null;
if (process.env.PHASE === "production")
    config_telegram = config.get("production.telegram");
else config_telegram = config.get("development.telegram");

router.post("/login", async function (req, res, next) {
    try {
        try {
            tgInitData.validate(req.body.initData, config_telegram.token);
        } catch (_) {
            return utils.SendError(res, errorCode.error_credential);
        }
        const initData = tgInitData.parse(req.body.initData);
        let user = await User.findOne({
            attributes: { exclude: ["mnemonic"] },
            include: {
                model: Wallet,
                attributes: { exclude: ["publicKey", "privateKey"] },
            },
            where: {
                username: initData.user.id,
            },
        });
        if (!user) {
            // Register a new user
            user = await User.create({
                username: initData.user.id,
                token: newToken(),
                tokenExpiresAt: sessionExpiresAt(),
            });
            user = JSON.parse(JSON.stringify(user));
            user.inited = false;
            user.wallets = [];
            return utils.SendResult(res, user);
        }
        if (user.biometricSecretHash) {
            const supplied = req.body.biometricSecret;
            const password = req.body.recoveryPassword;
            const validSecret = verifySecret(supplied, user.biometricSecretHash);
            if (!validSecret) {
                if (!password)
                    return utils.SendError(res, errorCode.error_biometric_required);
                if (!(await checkPwd(user, password, true)))
                    return utils.SendError(res, errorCode.error_pay_password);
            }
        }
        await user.update({ token: newToken(), tokenExpiresAt: sessionExpiresAt() });
        user = JSON.parse(JSON.stringify(user));
        user.biometricEnabled = Boolean(user.biometricSecretHash);
        delete user.biometricSecretHash;
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

router.post("/biometric/enable", auth, async function (req, res) {
    try {
        const user = await utils.GetCurUser(req);
        if (!(await checkPwd(user, req.body.password, true)))
            return utils.SendError(res, errorCode.error_pay_password);
        const secret = newSecret();
        const token = newToken();
        await user.update({
            biometricSecretHash: hashSecret(secret),
            token,
            tokenExpiresAt: sessionExpiresAt(),
        });
        return utils.SendResult(res, { secret, token });
    } catch (error) {
        return utils.SendError(res, error);
    }
});

router.post("/biometric/disable", auth, async function (req, res) {
    try {
        const user = await utils.GetCurUser(req);
        if (!(await checkPwd(user, req.body.password, true)))
            return utils.SendError(res, errorCode.error_pay_password);
        const token = newToken();
        await user.update({ biometricSecretHash: null, token, tokenExpiresAt: sessionExpiresAt() });
        return utils.SendResult(res, { token });
    } catch (error) {
        return utils.SendError(res, error);
    }
});

router.post("/password", auth, async function (req, res, next) {
    try {
        let user = await utils.GetCurUser(req);
        if (user.password && !(await checkPwd(user, req.body.old_password))) {
            return utils.SendError(res, errorCode.error_pay_password);
        }
        const removingPassword = !req.body.password || !req.body.password.length;
        if (
            !removingPassword &&
            (typeof req.body.password !== "string" || !/^\d{6}$/.test(req.body.password))
        )
            return utils.SendError(res, errorCode.error_form);
        const token = newToken();
        await User.update(
            {
                password: removingPassword ? null : await hashPwd(req.body.password),
                token,
                tokenExpiresAt: sessionExpiresAt(),
                biometricSecretHash: null,
            },
            {
                where: {
                    token: req.headers.token,
                },
            }
        );
        utils.SendResult(res, { token });
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
            verified: await checkPwd(user, req.body.password, true),
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
        await redis.set(key, secret, "EX", config.get("security.otp_setup_seconds"));
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
        if (await checkOtp(user.id, secret, req.body.code)) {
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
        if (await checkOtp(user.id, user.secret, req.body.code)) {
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
            biometricEnabled: Boolean(user.biometricSecretHash),
        });
    } catch (error) {
        console.log(error);
        utils.SendError(res, error);
    }
});

module.exports = router;
