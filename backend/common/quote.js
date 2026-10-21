const Decimal = require("decimal.js");

function minOut(quotedUnits) {
    const quoted = new Decimal(quotedUnits);
    if (!quoted.isFinite() || quoted.lte(0))
        throw new Error("Invalid swap quote");
    const minimum = BigInt(quoted.mul("0.99").floor().toFixed(0));
    if (minimum <= 0n) throw new Error("Swap quote is too small");
    return minimum;
}

module.exports = { minOut };
