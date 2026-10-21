const test = require("node:test");
const assert = require("node:assert/strict");
const utils = require("../common/utils");
const errorCode = require("../common/errorCode");

test("unexpected errors do not expose internal messages", () => {
    let body;
    utils.SendError({ send: (value) => (body = value) }, new Error("private key in request"));
    assert.equal(body.code, errorCode.error_unknown.code);
    assert.equal(body.message, errorCode.error_unknown.message);
});
