const test = require("node:test");
const assert = require("node:assert/strict");
const Wallet = require("../model/wallet");
const tron = require("../blockchains/tron");
const router = require("../routes/wallet/tron/swap");

const params = [
    ["getTransactionFee", 1000],
    ["getEnergyFee", 100],
].map(([key, value]) => ({ key, value }));

async function invoke(route, body) {
    const handler = router.stack.find((layer) => layer.route?.path === route).route.stack.at(-1).handle;
    let response;
    await handler({ body, user: { id: "user-1" } }, { send: (value) => { response = value; } });
    return response;
}

test("swap estimates use contract decimals only for the USDT side", async () => {
    const originalFindOne = Wallet.findOne;
    const originalGetTronWeb = tron.getTronWeb;
    const originalGetConfig = tron.getConfig;
    const network = { rpc_url: "test-network-precision", tokens: { usdt: "test-usdt-8", wtrx: "test-wtrx" }, sunswap: { router: "test-router" } };
    let inputToRouter;
    const fake = {
        contract: (_abi, address) => ({ methods: address === network.tokens.usdt ? {
            decimals: () => ({ call: async () => 8n }),
            balanceOf: () => ({ call: async () => 1000000000n }),
            allowance: () => ({ call: async () => ({ remaining: 1000000000n }) }),
        } : {
            getAmountsOut: (input) => ({ call: async () => {
                inputToRouter = input;
                return { amounts: [input, bodyQuote] };
            } }),
        } }),
        transactionBuilder: { triggerConstantContract: async () => ({
            transaction: { raw_data_hex: "ab".repeat(100) }, energy_used: 0,
        }) },
        trx: {
            sign: async () => ({ raw_data_hex: "ab".repeat(100), signature: ["cd".repeat(65)] }),
            getAccountResources: async () => ({ NetLimit: 1000 }),
            getChainParameters: async () => params,
        },
        fromSun: (units) => (Number(units) / 1000000).toString(),
    };
    let bodyQuote;
    Wallet.findOne = async () => ({ privateKey: "unused" });
    tron.getTronWeb = () => fake;
    tron.getConfig = () => network;
    try {
        bodyQuote = 250000000n; // 2.5 USDT with 8 decimals
        let result = await invoke("/trx2usdt/estimate", { address: "sender", amount: "1.5" });
        assert.equal(result.code, 0);
        assert.equal(inputToRouter, 1500000n);
        assert.equal(result.data.amount, "2.475");

        bodyQuote = 3000000n; // 3 TRX in sun
        result = await invoke("/usdt2trx/estimate", { address: "sender", amount: "1.25" });
        assert.equal(result.code, 0);
        assert.equal(inputToRouter, 125000000n);
        assert.equal(result.data.amount, "2.97");
    } finally {
        Wallet.findOne = originalFindOne;
        tron.getTronWeb = originalGetTronWeb;
        tron.getConfig = originalGetConfig;
    }
});
