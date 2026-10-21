const otplib = require("otplib");

async function checkOtp(userId, secret, code, redis = require("./redis")) {
    const attemptsKey = `user:${userId}:two_factor_attempts`;
    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) await redis.expire(attemptsKey, 5 * 60);
    if (attempts > 5 || typeof code !== "string" || !/^\d{6}$/.test(code))
        return false;
    const valid = otplib.authenticator.check(code, secret);
    if (valid) await redis.del(attemptsKey);
    return valid;
}

module.exports = { checkOtp };
