const test = require("node:test");
const assert = require("node:assert/strict");
const otplib = require("otplib");
const { checkOtp } = require("../common/otp");

test("2FA is locked after five invalid attempts", async () => {
    const values = new Map();
    const redis = {
        incr: async (key) => {
            const next = (values.get(key) || 0) + 1;
            values.set(key, next);
            return next;
        },
        expire: async () => 1,
        del: async (key) => values.delete(key),
    };
    const secret = otplib.authenticator.generateSecret();
    const code = otplib.authenticator.generate(secret);
    for (let i = 0; i < 5; i++)
        assert.equal(await checkOtp("test", secret, "000000x", redis), false);
    assert.equal(await checkOtp("test", secret, code, redis), false);
    values.clear();
    assert.equal(await checkOtp("test", secret, code, redis), true);
});
