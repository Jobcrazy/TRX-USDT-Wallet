const test = require("node:test");
const assert = require("node:assert/strict");
const { positiveSun } = require("../common/amount");

test("parses six decimal sun amounts exactly", () => {
    assert.equal(positiveSun("0.000001"), 1n);
    assert.equal(positiveSun("9007199254740993.123456"), 9007199254740993123456n);
});

test("rejects zero, negative and overprecise transaction amounts", () => {
    for (const value of [0, "0", "-1", "1.0000001", "1e3", null, {}])
        assert.throws(() => positiveSun(value));
});
