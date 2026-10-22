const errorCode = require("./errorCode");
const TRX_DECIMALS = 6; // TRON protocol: 1 TRX = 1,000,000 sun.

function positiveUnits(value, decimals) {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255 ||
        (typeof value !== "string" && typeof value !== "number"))
        throw errorCode.error_form;
    const text = String(value);
    if (!/^\d+(?:\.\d+)?$/.test(text)) throw errorCode.error_form;
    const [whole, fractional = ""] = text.split(".");
    if (fractional.length > decimals) throw errorCode.error_form;
    const amount = BigInt(whole) * 10n ** BigInt(decimals) +
        BigInt(fractional.padEnd(decimals, "0") || "0");
    if (amount <= 0n) throw errorCode.error_form;
    return amount;
}

function formatUnits(value, decimals) {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255)
        throw errorCode.error_form;
    const units = BigInt(value);
    const scale = 10n ** BigInt(decimals);
    const whole = units / scale;
    const fraction = (units % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
    return fraction ? `${whole}.${fraction}` : whole.toString();
}

const positiveSun = (value) => positiveUnits(value, TRX_DECIMALS);

module.exports = { TRX_DECIMALS, positiveSun, positiveUnits, formatUnits };
