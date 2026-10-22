const test = require("node:test");
const assert = require("node:assert/strict");
const { minOut, protectedMinOut } = require("../common/quote");

test("minimum output applies one percent tolerance before rounding down", () => {
    assert.equal(minOut("1000000"), 990000n);
    assert.equal(minOut("101"), 99n);
    assert.equal(minOut("12345678901234567890"), 12222222112222222211n);
});

test("minimum output rejects nonpositive quotes", () => {
    assert.throws(() => minOut("0"));
    assert.throws(() => minOut("-1"));
});

test("execution accepts price improvement while preserving the user's minimum", () => {
    assert.equal(protectedMinOut("1020000", "990000"), 1009800n);
    assert.equal(protectedMinOut("995000", "990000"), 990000n);
    assert.equal(protectedMinOut("980000", "990000"), null);
});
