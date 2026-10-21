const test = require("node:test");
const assert = require("node:assert/strict");
const { newSecret, hashSecret, verifySecret } = require("../common/bio");
const { newToken } = require("../common/session");

test("device secret is random, stored as a hash, and verified exactly", () => {
    const first = newSecret();
    const second = newSecret();
    assert.notEqual(first, second);
    assert.notEqual(newToken(), newToken());
    assert.equal(verifySecret(first, hashSecret(first)), true);
    assert.equal(verifySecret(second, hashSecret(first)), false);
    assert.equal(verifySecret("not-a-secret", hashSecret(first)), false);
    assert.equal(verifySecret(first, "malformed-hash"), false);
});
