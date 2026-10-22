const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);
const config = require("config");

const COST = 1 << 15;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

async function hashPwd(password) {
    if (typeof password !== "string" || !password || password.length > 128)
        throw new Error("Invalid payment password");
    const salt = crypto.randomBytes(SALT_BYTES);
    const hash = await scrypt(password, salt, KEY_BYTES, {
        N: COST,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024,
    });
    return `scrypt$${COST}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function matchPwd(password, stored) {
    if (typeof password !== "string" || typeof stored !== "string" || !stored)
        return false;
    if (!stored.startsWith("scrypt$")) {
        const supplied = Buffer.from(password);
        const legacy = Buffer.from(stored);
        return supplied.length === legacy.length && crypto.timingSafeEqual(supplied, legacy);
    }
    const parts = stored.split("$");
    if (
        parts.length !== 4 ||
        parts[1] !== String(COST) ||
        !/^[0-9a-f]{32}$/.test(parts[2]) ||
        !/^[0-9a-f]{64}$/.test(parts[3])
    )
        return false;
    const hash = await scrypt(password, Buffer.from(parts[2], "hex"), KEY_BYTES, {
        N: COST,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(hash, Buffer.from(parts[3], "hex"));
}

async function checkPwd(user, password, required = false) {
    if (!user.password) return !required;
    const redis = require("./redis");
    const attemptsKey = `user:${user.id}:payment_password_attempts`;
    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) await redis.expire(attemptsKey, config.get("security.attempt_window_seconds"));
    if (attempts > config.get("security.max_attempts")) return false;
    const valid = await matchPwd(password, user.password);
    if (!valid) return false;
    await redis.del(attemptsKey);
    if (valid && !user.password.startsWith("scrypt$")) {
        const oldPassword = user.password;
        const hashed = await hashPwd(password);
        const User = require("../model/user");
        await User.update(
            { password: hashed },
            { where: { id: user.id, password: oldPassword } }
        );
        user.password = hashed;
    }
    return valid;
}

module.exports = { hashPwd, matchPwd, checkPwd };
