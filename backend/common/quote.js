const Decimal = require("decimal.js");
const config = require("config");

function minOut(quotedUnits) {
    const quoted = new Decimal(quotedUnits);
    if (!quoted.isFinite() || quoted.lte(0))
        throw new Error("Invalid swap quote");
    const bps = config.get("wallet.swap_slippage_bps");
    if (!Number.isInteger(bps) || bps < 0 || bps >= 10000)
        throw new Error("Invalid swap slippage configuration");
    const minimum = BigInt(quoted.mul(10000 - bps).div(10000).floor().toFixed(0));
    if (minimum <= 0n) throw new Error("Swap quote is too small");
    return minimum;
}

function protectedMinOut(quotedUnits, requestedUnits) {
    const requested = BigInt(requestedUnits);
    const quoted = BigInt(quotedUnits);
    if (requested > quoted) return null;
    const currentMinimum = minOut(quoted);
    return requested > currentMinimum ? requested : currentMinimum;
}

module.exports = { minOut, protectedMinOut };
