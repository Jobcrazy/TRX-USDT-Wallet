const test = require("node:test");
const assert = require("node:assert/strict");
const { showTrx } = require("../common/trxTx");

const wallet = "41abcdef";
function transfer(overrides = {}) {
    return {
        ret: [{ contractRet: "SUCCESS" }],
        raw_data: {
            contract: [{
                type: "TransferContract",
                parameter: { value: {
                    owner_address: wallet,
                    to_address: "41ffffff",
                    amount: 1000000,
                    ...overrides,
                } },
            }],
        },
    };
}

test("accepts successful native TRX transfer involving the wallet", () => {
    assert.equal(showTrx(transfer(), wallet.toUpperCase()), true);
    const incoming = transfer({ owner_address: "41ffffff", to_address: wallet });
    assert.equal(showTrx(incoming, wallet), true);
    assert.equal(showTrx(transfer({ amount: "9007199254740993" }), wallet), true);
    assert.equal(showTrx({ ...transfer(), ret: [] }, wallet), false);
});

test("rejects dust, failed, unrelated and nontransfer transactions", () => {
    assert.equal(showTrx(transfer({ amount: 999999 }), wallet), false);
    assert.equal(showTrx(transfer({ owner_address: "41aaaaaa" }), wallet), false);
    assert.equal(showTrx({ ...transfer(), ret: [{ contractRet: "REVERT" }] }, wallet), false);
    const asset = transfer();
    asset.raw_data.contract[0].type = "TransferAssetContract";
    assert.equal(showTrx(asset, wallet), false);
});
