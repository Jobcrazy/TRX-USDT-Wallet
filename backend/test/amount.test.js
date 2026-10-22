const test = require("node:test");
const assert = require("node:assert/strict");
const { positiveSun, positiveUnits, formatUnits } = require("../common/amount");

test("parses six decimal sun amounts exactly", () => {
    assert.equal(positiveSun("0.000001"), 1n);
    assert.equal(positiveSun("9007199254740993.123456"), 9007199254740993123456n);
});

test("rejects zero, negative and overprecise transaction amounts", () => {
    for (const value of [0, "0", "-1", "1.0000001", "1e3", null, {}])
        assert.throws(() => positiveSun(value));
});

test("token precision is applied to input and output without Number rounding", () => {
    assert.equal(positiveUnits("0.00000001", 8), 1n);
    assert.equal(formatUnits(9007199254740993123456n, 8), "90071992547409.93123456");
    assert.throws(() => positiveUnits("1.000000001", 8));
    assert.equal(formatUnits(42n, 0), "42");
});
