const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPwd, matchPwd } = require("../common/payPwd");

test("payment password uses a salted adaptive hash", async () => {
    const first = await hashPwd("123456");
    const second = await hashPwd("123456");
    assert.notEqual(first, second);
    assert.equal(await matchPwd("123456", first), true);
    assert.equal(await matchPwd("123457", first), false);
});

test("legacy passwords remain verifiable during migration", async () => {
    assert.equal(await matchPwd("123456", "123456"), true);
    assert.equal(await matchPwd("000000", "123456"), false);
    await assert.rejects(() => hashPwd(""));
});
