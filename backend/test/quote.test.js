const test = require("node:test");
const assert = require("node:assert/strict");
const { minOut } = require("../common/quote");

test("minimum output applies one percent tolerance before rounding down", () => {
    assert.equal(minOut("1000000"), 990000n);
    assert.equal(minOut("101"), 99n);
    assert.equal(minOut("12345678901234567890"), 12222222112222222211n);
});

test("minimum output rejects nonpositive quotes", () => {
    assert.throws(() => minOut("0"));
    assert.throws(() => minOut("-1"));
});
