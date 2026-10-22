const config = require("config");

// TRON resource rules: https://developers.tron.network/docs/paying-for-resources

function chainValue(parameters, key) {
    const value = parameters.find((entry) => entry.key === key)?.value;
    if (!Number.isSafeInteger(value) || value < 0)
        throw new Error(`Missing or invalid TRON chain parameter: ${key}`);
    return BigInt(value);
}

function remaining(resources, limit, used) {
    return Math.max(0, (resources[limit] || 0) - (resources[used] || 0));
}

function transactionBytes(signedTx, kind) {
    const reserve = config.get(`wallet.transaction_size_reserve_bytes.${kind}`);
    if (!Number.isSafeInteger(reserve) || reserve < 0)
        throw new Error("Invalid transaction size reserve");
    if (!signedTx.raw_data_hex || !Array.isArray(signedTx.signature))
        throw new Error("Invalid signed transaction");
    const signatureBytes = signedTx.signature.reduce((sum, signature) => sum + signature.length / 2, 0);
    return signedTx.raw_data_hex.length / 2 + signatureBytes + reserve;
}

async function estimateFee(tronWebInst, address, signedTx, options = {}) {
    const { kind = "contract", energyUsed = 0, activatesAccount = false } = options;
    const [resources, parameters] = await Promise.all([
        tronWebInst.trx.getAccountResources(address),
        tronWebInst.trx.getChainParameters(),
    ]);
    const bytes = transactionBytes(signedTx, kind);
    const stakedBandwidth = remaining(resources, "NetLimit", "NetUsed");
    const freeBandwidth = remaining(resources, "freeNetLimit", "freeNetUsed");
    let cost = 0n;

    if (activatesAccount) {
        cost += chainValue(parameters, "getCreateNewAccountFeeInSystemContract");
        const rate = chainValue(parameters, "getCreateNewAccountBandwidthRate");
        if (BigInt(stakedBandwidth) < BigInt(bytes) * rate)
            cost += chainValue(parameters, "getCreateAccountFee");
    } else if (stakedBandwidth < bytes && freeBandwidth < bytes) {
        cost += BigInt(bytes) * chainValue(parameters, "getTransactionFee");
    }

    if (energyUsed) {
        if (!Number.isSafeInteger(energyUsed) || energyUsed < 0)
            throw new Error("Invalid estimated Energy consumption");
        const availableEnergy = remaining(resources, "EnergyLimit", "EnergyUsed");
        if (energyUsed > availableEnergy)
            cost += BigInt(energyUsed - availableEnergy) * chainValue(parameters, "getEnergyFee");
    }
    return cost;
}

module.exports = { estimateFee, transactionBytes };
