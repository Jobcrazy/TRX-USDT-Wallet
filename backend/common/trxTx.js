const MIN_TRANSFER_SUN = 1000000;

function showTrx(transaction, addressHex) {
    const contract = transaction?.raw_data?.contract?.[0];
    const value = contract?.parameter?.value;
    if (contract?.type !== "TransferContract" || !value) return false;
    const result = transaction.ret?.[0];
    if (result?.contractRet !== "SUCCESS") return false;
    if (result?.ret && result.ret !== "SUCESS" && result.ret !== "SUCCESS")
        return false;
    const amount = value.amount;
    if (
        (typeof amount !== "number" || !Number.isSafeInteger(amount)) &&
        (typeof amount !== "string" || !/^\d+$/.test(amount))
    )
        return false;
    if (BigInt(amount) < BigInt(MIN_TRANSFER_SUN)) return false;

    const walletAddress = addressHex.toLowerCase();
    return (
        value.owner_address?.toLowerCase() === walletAddress ||
        value.to_address?.toLowerCase() === walletAddress
    );
}

module.exports = { showTrx };
