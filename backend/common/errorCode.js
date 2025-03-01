module.exports = {
    error_success: {
        code: 0,
        message: "Success",
    },
    error_login: {
        code: 1,
        type: "login",
        message: "You have not logged in",
    },
    error_unknown: {
        code: 2,
        type: "unknown",
        message: "Unknown Error",
    },
    error_credential: {
        code: 3,
        type: "credential",
        message: "Incorrect password or 2FA code",
    },
    error_no_user: {
        code: 4,
        type: "no_user",
        message: "The user doesn't exist",
    },
    error_del_sysadmin: {
        code: 5,
        type: "del_sysadmin",
        message: "You can't delete the system admin",
    },
    error_not_admin: {
        code: 6,
        type: "not_admin",
        message: "You are not an administrator",
    },
    error_form: {
        code: 7,
        type: "form",
        message: "Invalid form",
    },
    error_io: {
        code: 8,
        type: "io",
        message: "IO error",
    },
    error_lack_param: {
        code: 9,
        type: "lack_param",
        message: "Lack of param",
    },
    error_mnenomic: {
        code: 10,
        type: "mnenomic",
        message: "Invalid mnenomic",
    },
    error_seed: {
        code: 11,
        type: "seed",
        message: "Wallet seed exists",
    },
    error_no_seed: {
        code: 11,
        type: "no_seed",
        message: "No wallet seed",
    },
    error_address: {
        code: 12,
        type: "address_owner",
        message: "Address owner",
    },
    error_invalid_address: {
        code: 13,
        type: "invalid_address",
        message: "Invalid Address",
    },
    error_balance: {
        code: 14,
        type: "balance",
        message: "Insufficient balance",
    },
    error_transaction: {
        code: 15,
        type: "transaction",
        message: "Transaction failed",
    },
    error_inactivated_account: {
        code: 16,
        type: "inactivated_account",
        message: "Inactivated account",
    },
    error_too_many_wallet: {
        code: 17,
        type: "wallet_number",
        message: "Too many wallets",
    },
    error_pay_password: {
        code: 18,
        type: "pay_password",
        message: "Incorrect password",
    },
    error_secret: {
        code: 19,
        type: "2fa_bind",
        message: "Already enabled 2FA",
    },
    error_invalid_secret: {
        code: 20,
        type: "2fa_secret",
        message: "Invalid 2FA Code",
    },
    error_approve: {
        code: 20,
        type: "approve",
        message: "Insufficient approved amount",
    },
};
