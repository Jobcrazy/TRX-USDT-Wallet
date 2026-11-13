const axios = require("axios");
const Decimal = require("decimal.js");
const config = require("config");

let cached;
let expires = 0;

function emptyRates() {
    return Object.fromEntries(Object.keys(config.get("pricing.spot_pairs"))
        .map((token) => [token, null]));
}

function price(quote) {
    if (!quote?.price) return null;
    try {
        const value = new Decimal(quote.price);
        return value.isFinite() && value.greaterThan(0) ? value.toString() : null;
    } catch {
        return null;
    }
}

async function rates() {
    const pairs = config.get("pricing.spot_pairs");
    if (process.env.PHASE !== "production") return emptyRates();
    if (cached && Date.now() < expires) return cached;
    const response = await axios.get(config.get("pricing.spot_url"), {
        params: { symbols: JSON.stringify(Object.values(pairs)) },
        timeout: config.get("pricing.timeout_ms"),
    });
    if (!Array.isArray(response.data)) throw new Error("Invalid spot prices");
    cached = Object.fromEntries(Object.entries(pairs).map(([token, pair]) => [
        token,
        price(response.data.find((item) => item.symbol === pair)),
    ]));
    expires = Date.now() + config.get("pricing.cache_ms");
    return cached;
}

module.exports = { rates, emptyRates };
