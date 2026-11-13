const { JsonRpcProvider, Wallet, Contract, isAddress } = require("ethers");
const config = require("config");
const errorCode = require("../../common/errorCode");

const abi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function transfer(address,uint256) returns (bool)",
];

function getConfig() {
    const phase = process.env.PHASE === "production" ? "production" : "development";
    return config.get(`${phase}.blockchain.bsc`);
}

function provider() {
    const chain = getConfig();
    return new JsonRpcProvider(chain.rpc_url, chain.chain_id);
}

function token(inst, symbol = "usdt") {
    const address = getConfig().tokens[symbol];
    if (!address || !isAddress(address)) throw errorCode.error_token_unavailable;
    return new Contract(address, abi, inst);
}

module.exports = { getConfig, provider, token, Wallet, isAddress };
