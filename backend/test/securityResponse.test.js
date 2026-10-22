const test = require("node:test");
const assert = require("node:assert/strict");
require.cache[require.resolve("../common/redis")] = { exports: {} };
const router = require("../routes/user");

test("security settings expose server biometric state to another device", async () => {
    const handler = router.stack.find((layer) => layer.route?.path === "/get_security").route.stack.at(-1).handle;
    let response;
    await handler({ user: { password: "hash", secret: null, biometricSecretHash: "hash" } }, {
        send: (value) => { response = value; },
    });
    assert.equal(response.code, 0);
    assert.deepEqual(response.data, { password: true, secret: false, biometricEnabled: true });
});
