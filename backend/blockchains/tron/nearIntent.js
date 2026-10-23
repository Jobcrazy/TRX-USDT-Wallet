const axios = require("axios");
const config = require("config");
const { verifyQuoteSignature } = require("@defuse-protocol/one-click-sdk-typescript");
const tron = require("./index");
const errorCode = require("../../common/errorCode");
const { positiveSun, positiveUnits, formatUnits } = require("../../common/amount");
const { estimateFee } = require("./estimateFee");

const API = "https://1click.chaindefuser.com/v0";
const MAINNET_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRX_DECIMALS = 6;

function headers() {
    const result = { "Content-Type": "application/json" };
    if (process.env.NEAR_INTENTS_API_KEY)
        result["X-API-Key"] = process.env.NEAR_INTENTS_API_KEY;
    return result;
}

async function assets() {
    // 1Click has no Nile deployment. Match the configured contract to its mainnet USDT.
    if (process.env.PHASE !== "production" || tron.getConfig().tokens.usdt !== MAINNET_USDT)
        throw errorCode.error_near_mainnet;
    const response = await axios.get(`${API}/tokens`, { headers: headers(), timeout: 10000 });
    const tokens = response.data;
    if (!Array.isArray(tokens)) throw new Error("Invalid 1Click token list");
    const trx = tokens.find((token) => token.blockchain === "tron" &&
        token.symbol === "TRX" && token.contractAddress == null && token.decimals === TRX_DECIMALS);
    const usdt = tokens.find((token) => token.blockchain === "tron" &&
        token.symbol === "USDT" && token.contractAddress === MAINNET_USDT && token.decimals === 6);
    if (!trx?.assetId || !usdt?.assetId) throw new Error("TRON pair is unavailable on 1Click");
    return { trx: trx.assetId, usdt: usdt.assetId };
}

async function quote(direction, address, amount) {
    if (direction !== "trx2usdt" && direction !== "usdt2trx")
        throw errorCode.error_form;
    const fromTrx = direction === "trx2usdt";
    const units = fromTrx ? positiveSun(amount) : positiveUnits(amount, 6);
    const pair = await assets();
    const request = {
        dry: false,
        swapType: "EXACT_INPUT",
        slippageTolerance: config.get("wallet.swap_slippage_bps"),
        originAsset: fromTrx ? pair.trx : pair.usdt,
        depositType: "ORIGIN_CHAIN",
        destinationAsset: fromTrx ? pair.usdt : pair.trx,
        amount: units.toString(),
        refundTo: address,
        refundType: "ORIGIN_CHAIN",
        recipient: address,
        recipientType: "DESTINATION_CHAIN",
        deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
    const response = await axios.post(`${API}/quote`, request, {
        headers: headers(), timeout: 15000,
    });
    const result = response.data;
    if (!verifyQuoteSignature(result)) throw new Error("Invalid 1Click quote signature");
    const returned = result.quoteRequest;
    const output = result.quote;
    if (!returned || !output || returned.originAsset !== request.originAsset ||
        returned.destinationAsset !== request.destinationAsset ||
        returned.amount !== request.amount || returned.recipient !== address ||
        returned.refundTo !== address || returned.depositType !== "ORIGIN_CHAIN" ||
        returned.recipientType !== "DESTINATION_CHAIN" ||
        returned.refundType !== "ORIGIN_CHAIN" || returned.swapType !== "EXACT_INPUT" ||
        returned.dry !== false || returned.slippageTolerance !== request.slippageTolerance ||
        output.amountIn !== request.amount || !output.depositAddress || output.depositMemo ||
        !/^\d+$/.test(output.minAmountOut || "") ||
        !/^\d+$/.test(output.amountOut || "") ||
        BigInt(output.minAmountOut) <= 0n ||
        BigInt(output.minAmountOut) > BigInt(output.amountOut) ||
        !Number.isFinite(Date.parse(output.deadline)) ||
        Date.parse(output.deadline) <= Date.now() + 90 * 1000)
        throw new Error("Invalid or expired 1Click quote");
    return { result, direction, amount: String(amount), amountUnits: units.toString() };
}

async function depositTransaction(inst, from, quoteData, checkBalance = true) {
    const { result, direction, amountUnits } = quoteData;
    const to = result.quote.depositAddress;
    if (!inst.isAddress(from) || !inst.isAddress(to) || from === to)
        throw errorCode.error_invalid_address;
    if (direction === "trx2usdt") {
        const account = await inst.trx.getAccount(to);
        const activatesAccount = !Object.keys(account).length;
        const transaction = await inst.transactionBuilder.sendTrx(to, amountUnits, from);
        const signed = await inst.trx.sign(transaction);
        const fee = await estimateFee(inst, from, signed, { kind: "trx", activatesAccount });
        if (checkBalance) {
            const balance = BigInt(await inst.trx.getBalance(from));
            if (balance < BigInt(amountUnits) + fee) throw errorCode.error_balance;
        }
        return { signed, fee };
    }
    if (checkBalance) {
        const contract = inst.contract(require("./tokens/usdt"), MAINNET_USDT);
        const balance = BigInt(await contract.methods.balanceOf(from).call());
        if (balance < BigInt(amountUnits)) throw errorCode.error_balance;
    }
    const parameters = [
        { type: "address", value: to },
        { type: "uint256", value: amountUnits },
    ];
    const tx = await inst.transactionBuilder.triggerConstantContract(
        MAINNET_USDT, "transfer(address,uint256)", {}, parameters
    );
    if (!tx?.result?.result || !tx.transaction ||
        !Number.isSafeInteger(tx.energy_used) || tx.energy_used <= 0 ||
        (tx.constant_result?.[0] && BigInt(`0x${tx.constant_result[0]}`) === 0n))
        throw new Error("USDT deposit simulation failed");
    const signedEstimate = await inst.trx.sign(tx.transaction);
    const fee = await estimateFee(inst, from, signedEstimate, { energyUsed: tx.energy_used });
    if (checkBalance && BigInt(await inst.trx.getBalance(from)) < fee)
        throw errorCode.error_balance;
    const transfer = await inst.transactionBuilder.triggerSmartContract(
        MAINNET_USDT, "transfer(address,uint256)", {}, parameters
    );
    if (!transfer?.result?.result || !transfer.transaction)
        throw new Error("USDT deposit transaction failed");
    return { signed: await inst.trx.sign(transfer.transaction), fee };
}

function publicQuote(data, fee) {
    return {
        amount: formatUnits(data.result.quote.minAmountOut, 6),
        minAmountOut: data.result.quote.minAmountOut,
        cost: formatUnits(fee, 6),
        deadline: data.result.quote.deadline,
    };
}

async function notifyDeposit(address, txid) {
    try {
        await axios.post(`${API}/deposit/submit`, {
            depositAddress: address,
            txHash: txid,
        }, { headers: headers(), timeout: 5000 });
    } catch (error) {
        console.error("1Click deposit notification failed", error.message);
    }
}

module.exports = { quote, depositTransaction, publicQuote, notifyDeposit };
