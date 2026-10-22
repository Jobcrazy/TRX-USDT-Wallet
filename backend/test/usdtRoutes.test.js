const test = require("node:test");
const assert = require("node:assert/strict");
const Wallet = require("../model/wallet");
const tron = require("../blockchains/tron");
const router = require("../routes/wallet/tron/tokens/usdt");
const errorCode = require("../common/errorCode");

async function invoke(route, body) {
    const handler = router.stack.find((layer) => layer.route?.path === route).route.stack.at(-1).handle;
    let response;
    await handler({ body, user: { id: "user-1", password: null, secret: null } }, {
        send: (value) => { response = value; },
    });
    return response;
}

test("USDT balance, allowance, transfer and approve share the contract precision", async () => {
    const originalFindOne = Wallet.findOne;
    const originalGetTronWeb = tron.getTronWeb;
    const originalGetConfig = tron.getConfig;
    const network = { rpc_url: "usdt-route-network", tokens: { usdt: "usdt-route-token" }, sunswap: { router: "spender" } };
    const sent = [];
    const fake = {
        contract: () => ({ methods: {
            decimals: () => ({ call: async () => 8n }),
            balanceOf: () => ({ call: async () => 123456789n }),
            allowance: () => ({ call: async () => ({ remaining: 200000000n }) }),
        } }),
        isAddress: () => true,
        trx: {
            getAccount: async () => ({ address: "activated" }),
            sign: async (tx) => tx,
            sendRawTransaction: async () => ({ result: true, txid: "tx" }),
        },
        transactionBuilder: { triggerSmartContract: async (_address, selector, _options, parameters) => {
            sent.push({ selector, parameters });
            return { transaction: { raw_data_hex: "ab" } };
        } },
    };
    Wallet.findOne = async () => ({ privateKey: "unused" });
    tron.getTronWeb = () => fake;
    tron.getConfig = () => network;
    try {
        let result = await invoke("/balance", { address: "sender" });
        assert.equal(result.data.balance, "1.23456789");
        result = await invoke("/allowance", { address: "sender" });
        assert.equal(result.data.amount, "2");
        result = await invoke("/transfer", { from: "sender", to: "receiver", amount: "0.00000001" });
        assert.equal(result.code, 0);
        assert.equal(sent[0].selector, "transfer(address,uint256)");
        assert.equal(sent[0].parameters[1].value, 1n);
        result = await invoke("/approve", { address: "sender", amount: "1.25" });
        assert.equal(result.code, 0);
        assert.equal(sent[1].selector, "approve(address,uint256)");
        assert.equal(sent[1].parameters[1].value, 125000000n);
        fake.isAddress = () => false;
        fake.contract = () => { throw new Error("Contract read must not happen"); };
        result = await invoke("/transfer", { from: "sender", to: "invalid", amount: "1" });
        assert.equal(result.code, errorCode.error_invalid_address.code);
    } finally {
        Wallet.findOne = originalFindOne;
        tron.getTronWeb = originalGetTronWeb;
        tron.getConfig = originalGetConfig;
    }
});
