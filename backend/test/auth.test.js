const test = require("node:test");
const assert = require("node:assert/strict");
const auth = require("../common/auth");
const User = require("../model/user");

test("expired sessions are rejected and valid users are reused", async () => {
    const original = User.findOne;
    const responses = [];
    const res = { send: (body) => responses.push(body) };
    try {
        User.findOne = async () => ({ tokenExpiresAt: new Date(Date.now() - 1000) });
        await auth({ headers: { token: "expired" } }, res, () => assert.fail("expired"));
        assert.equal(responses[0].type, "login");

        const user = { tokenExpiresAt: new Date(Date.now() + 10000) };
        User.findOne = async () => user;
        const req = { headers: { token: "valid" } };
        let passed = false;
        await auth(req, res, () => { passed = true; });
        assert.equal(passed, true);
        assert.equal(req.user, user);
    } finally {
        User.findOne = original;
    }
});
