const test = require("node:test");
const assert = require("node:assert/strict");
const { estimateFee } = require("../blockchains/tron/estimateFee");

const params = [
    ["getCreateNewAccountFeeInSystemContract", 1000000],
    ["getCreateNewAccountBandwidthRate", 1],
    ["getCreateAccountFee", 100000],
    ["getTransactionFee", 1000],
    ["getEnergyFee", 100],
].map(([key, value]) => ({ key, value }));

const signed = { raw_data_hex: "ab".repeat(100), signature: ["cd".repeat(65)] };
const reader = (resources, chainParameter = params) => ({ trx: {
    getAccountResources: async () => resources,
    getChainParameters: async () => chainParameter,
} });

test("account activation uses chain fees and excludes free bandwidth", async () => {
    const freeOnly = reader({ freeNetLimit: 1000, freeNetUsed: 0 });
    assert.equal(await estimateFee(freeOnly, "sender", signed, { kind: "trx", activatesAccount: true }), 1100000n);
    const staked = reader({ NetLimit: 1000, NetUsed: 0 });
    assert.equal(await estimateFee(staked, "sender", signed, { kind: "trx", activatesAccount: true }), 1000000n);
});

test("normal bandwidth requires one quota to cover the whole transaction", async () => {
    const split = reader({ NetLimit: 120, freeNetLimit: 120 });
    assert.equal(await estimateFee(split, "sender", signed, { kind: "trx" }), 234000n);
    const free = reader({ freeNetLimit: 300 });
    assert.equal(await estimateFee(free, "sender", signed, { kind: "trx" }), 0n);
});

test("energy shortage is charged at the chain rate", async () => {
    const account = reader({ NetLimit: 1000, EnergyLimit: 20, EnergyUsed: 5 });
    assert.equal(await estimateFee(account, "sender", signed, { energyUsed: 25 }), 1000n);
});

test("missing chain parameter fails instead of quoting zero", async () => {
    await assert.rejects(() => estimateFee(reader({}, []), "sender", signed, { kind: "trx" }));
});
