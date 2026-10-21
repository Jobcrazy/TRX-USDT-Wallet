const errorCode = require("./errorCode");

function positiveSun(value) {
    if (typeof value !== "string" && typeof value !== "number")
        throw errorCode.error_form;
    const text = String(value);
    if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw errorCode.error_form;
    const [whole, fractional = ""] = text.split(".");
    const amount = BigInt(whole) * 1000000n + BigInt(fractional.padEnd(6, "0") || "0");
    if (amount <= 0n) throw errorCode.error_form;
    return amount;
}

module.exports = { positiveSun };
