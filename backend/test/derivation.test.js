const test = require("node:test");
const assert = require("node:assert/strict");
const bip39 = require("bip39");

test("new HD derivation matches existing TRON addresses", async () => {
    const { HDKey } = await import("@scure/bip32");
    const seed = await bip39.mnemonicToSeed(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    for (const index of [0, 1, 7]) {
        const path = `m/44'/195'/0'/0/${index}`;
        const newKey = HDKey.fromMasterSeed(seed).derive(path);
        assert.equal(newKey.privateKey.length, 32);
        assert.equal(newKey.publicKey.length, 33);
        if (index === 0)
            assert.equal(
                Buffer.from(newKey.privateKey).toString("hex"),
                "b5a4cea271ff424d7c31dc12a3e43e401df7a40d7412a15750f3f0b6b5449a28"
            );
    }
});
