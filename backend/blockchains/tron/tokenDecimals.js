const usdtAbi = require("./tokens/usdt");

const cache = new Map();

async function getTokenDecimals(tronWebInst, address, networkUrl) {
    const key = `${networkUrl}:${address}`;
    if (!cache.has(key)) {
        const pending = (async () => {
            const contract = tronWebInst.contract(usdtAbi, address);
            const raw = await contract.methods.decimals().call();
            const value = Number(raw.toString());
            if (!Number.isInteger(value) || value < 0 || value > 255)
                throw new Error("Invalid token decimals returned by contract");
            return value;
        })();
        cache.set(key, pending);
        pending.catch(() => cache.delete(key));
    }
    return cache.get(key);
}

module.exports = { getTokenDecimals };
