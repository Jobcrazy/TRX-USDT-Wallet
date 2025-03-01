const tronweb = require("tronweb");
const axios = require("axios");
const config = require("config");

let config_tron = null;
if (process.env.PHASE === "production")
    config_tron = config.get("production.blockchain.tron");
else config_tron = config.get("development.blockchain.tron");

const tronWeb = {
    getConfig: () => {
        return config_tron;
    },
    getTronWeb: (privateKey) => {
        return new tronweb.TronWeb({
            fullHost: config_tron.rpc_url,
            headers: config_tron.headers,
            privateKey,
        });
    },
    getHistory: async (address, fingerprint, limit) => {
        let url = `${config_tron.rpc_url}/v1/accounts/${address}/transactions`;
        return await axios({
            method: "GET",
            url,
            headers: {
                Accept: "application/json",
            },
            params: {
                limit,
                fingerprint,
                // only_confirmed: true,
            },
        });
    },
    getTRC20History: async (address, contract_address, fingerprint, limit) => {
        let url = `${config_tron.rpc_url}/v1/accounts/${address}/transactions/trc20`;
        return await axios({
            method: "GET",
            url,
            headers: {
                Accept: "application/json",
            },
            params: {
                contract_address,
                limit,
                fingerprint,
                // only_confirmed: true,
            },
        });
    },
};

module.exports = tronWeb;
