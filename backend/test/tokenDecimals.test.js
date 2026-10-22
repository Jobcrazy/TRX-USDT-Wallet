const test = require("node:test");
const assert = require("node:assert/strict");
const { getTokenDecimals } = require("../blockchains/tron/tokenDecimals");

test("reads decimals from the contract once per network and address", async () => {
    let calls = 0;
    const tron = { contract: () => ({ methods: { decimals: () => ({ call: async () => {
        calls++;
        return 6n;
    } }) } }) };
    const results = await Promise.all([
        getTokenDecimals(tron, "token-a", "network-a"),
        getTokenDecimals(tron, "token-a", "network-a"),
    ]);
    assert.deepEqual(results, [6, 6]);
    assert.equal(calls, 1);
});

test("a failed read is retried and an invalid precision is rejected", async () => {
    let calls = 0;
    const tron = { contract: () => ({ methods: { decimals: () => ({ call: async () => {
        calls++;
        if (calls === 1) throw new Error("RPC unavailable");
        return 8n;
    } }) } }) };
    await assert.rejects(() => getTokenDecimals(tron, "token-b", "network-b"));
    assert.equal(await getTokenDecimals(tron, "token-b", "network-b"), 8);
    const invalid = { contract: () => ({ methods: { decimals: () => ({ call: async () => "NaN" }) } }) };
    await assert.rejects(() => getTokenDecimals(invalid, "token-c", "network-c"));
});
