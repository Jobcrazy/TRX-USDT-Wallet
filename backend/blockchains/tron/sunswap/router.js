module.exports = [
    {
        inputs: [
            {
                name: "_factory",
                type: "address",
            },
            {
                name: "_WETH",
                type: "address",
            },
        ],
        stateMutability: "Nonpayable",
        type: "Constructor",
    },
    {
        outputs: [
            {
                type: "address",
            },
        ],
        name: "WETH",
        stateMutability: "View",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountA",
                type: "uint256",
            },
            {
                name: "amountB",
                type: "uint256",
            },
            {
                name: "liquidity",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "tokenA",
                type: "address",
            },
            {
                name: "tokenB",
                type: "address",
            },
            {
                name: "amountADesired",
                type: "uint256",
            },
            {
                name: "amountBDesired",
                type: "uint256",
            },
            {
                name: "amountAMin",
                type: "uint256",
            },
            {
                name: "amountBMin",
                type: "uint256",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "addLiquidity",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountToken",
                type: "uint256",
            },
            {
                name: "amountETH",
                type: "uint256",
            },
            {
                name: "liquidity",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "token",
                type: "address",
            },
            {
                name: "amountTokenDesired",
                type: "uint256",
            },
            {
                name: "amountTokenMin",
                type: "uint256",
            },
            {
                name: "amountETHMin",
                type: "uint256",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "addLiquidityETH",
        stateMutability: "Payable",
        type: "Function",
    },
    {
        outputs: [
            {
                type: "address",
            },
        ],
        name: "factory",
        stateMutability: "View",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountIn",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "amountOut",
                type: "uint256",
            },
            {
                name: "reserveIn",
                type: "uint256",
            },
            {
                name: "reserveOut",
                type: "uint256",
            },
        ],
        name: "getAmountIn",
        stateMutability: "Pure",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountOut",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "amountIn",
                type: "uint256",
            },
            {
                name: "reserveIn",
                type: "uint256",
            },
            {
                name: "reserveOut",
                type: "uint256",
            },
        ],
        name: "getAmountOut",
        stateMutability: "Pure",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amounts",
                type: "uint256[]",
            },
        ],
        inputs: [
            {
                name: "amountOut",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
        ],
        name: "getAmountsIn",
        stateMutability: "View",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amounts",
                type: "uint256[]",
            },
        ],
        inputs: [
            {
                name: "amountIn",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
        ],
        name: "getAmountsOut",
        stateMutability: "View",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "pair",
                type: "address",
            },
        ],
        inputs: [
            {
                name: "tokenA",
                type: "address",
            },
            {
                name: "tokenB",
                type: "address",
            },
        ],
        name: "getPairOffChain",
        stateMutability: "View",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountB",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "amountA",
                type: "uint256",
            },
            {
                name: "reserveA",
                type: "uint256",
            },
            {
                name: "reserveB",
                type: "uint256",
            },
        ],
        name: "quote",
        stateMutability: "Pure",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountA",
                type: "uint256",
            },
            {
                name: "amountB",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "tokenA",
                type: "address",
            },
            {
                name: "tokenB",
                type: "address",
            },
            {
                name: "liquidity",
                type: "uint256",
            },
            {
                name: "amountAMin",
                type: "uint256",
            },
            {
                name: "amountBMin",
                type: "uint256",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "removeLiquidity",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountToken",
                type: "uint256",
            },
            {
                name: "amountETH",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "token",
                type: "address",
            },
            {
                name: "liquidity",
                type: "uint256",
            },
            {
                name: "amountTokenMin",
                type: "uint256",
            },
            {
                name: "amountETHMin",
                type: "uint256",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "removeLiquidityETH",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountETH",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "token",
                type: "address",
            },
            {
                name: "liquidity",
                type: "uint256",
            },
            {
                name: "amountTokenMin",
                type: "uint256",
            },
            {
                name: "amountETHMin",
                type: "uint256",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "removeLiquidityETHSupportingFeeOnTransferTokens",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountToken",
                type: "uint256",
            },
            {
                name: "amountETH",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "token",
                type: "address",
            },
            {
                name: "liquidity",
                type: "uint256",
            },
            {
                name: "amountTokenMin",
                type: "uint256",
            },
            {
                name: "amountETHMin",
                type: "uint256",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
            {
                name: "approveMax",
                type: "bool",
            },
            {
                name: "v",
                type: "uint8",
            },
            {
                name: "r",
                type: "bytes32",
            },
            {
                name: "s",
                type: "bytes32",
            },
        ],
        name: "removeLiquidityETHWithPermit",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountETH",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "token",
                type: "address",
            },
            {
                name: "liquidity",
                type: "uint256",
            },
            {
                name: "amountTokenMin",
                type: "uint256",
            },
            {
                name: "amountETHMin",
                type: "uint256",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
            {
                name: "approveMax",
                type: "bool",
            },
            {
                name: "v",
                type: "uint8",
            },
            {
                name: "r",
                type: "bytes32",
            },
            {
                name: "s",
                type: "bytes32",
            },
        ],
        name: "removeLiquidityETHWithPermitSupportingFeeOnTransferTokens",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amountA",
                type: "uint256",
            },
            {
                name: "amountB",
                type: "uint256",
            },
        ],
        inputs: [
            {
                name: "tokenA",
                type: "address",
            },
            {
                name: "tokenB",
                type: "address",
            },
            {
                name: "liquidity",
                type: "uint256",
            },
            {
                name: "amountAMin",
                type: "uint256",
            },
            {
                name: "amountBMin",
                type: "uint256",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
            {
                name: "approveMax",
                type: "bool",
            },
            {
                name: "v",
                type: "uint8",
            },
            {
                name: "r",
                type: "bytes32",
            },
            {
                name: "s",
                type: "bytes32",
            },
        ],
        name: "removeLiquidityWithPermit",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amounts",
                type: "uint256[]",
            },
        ],
        inputs: [
            {
                name: "amountOut",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "swapETHForExactTokens",
        stateMutability: "Payable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amounts",
                type: "uint256[]",
            },
        ],
        inputs: [
            {
                name: "amountOutMin",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "swapExactETHForTokens",
        stateMutability: "Payable",
        type: "Function",
    },
    {
        inputs: [
            {
                name: "amountOutMin",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "swapExactETHForTokensSupportingFeeOnTransferTokens",
        stateMutability: "Payable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amounts",
                type: "uint256[]",
            },
        ],
        inputs: [
            {
                name: "amountIn",
                type: "uint256",
            },
            {
                name: "amountOutMin",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "swapExactTokensForETH",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        inputs: [
            {
                name: "amountIn",
                type: "uint256",
            },
            {
                name: "amountOutMin",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "swapExactTokensForETHSupportingFeeOnTransferTokens",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amounts",
                type: "uint256[]",
            },
        ],
        inputs: [
            {
                name: "amountIn",
                type: "uint256",
            },
            {
                name: "amountOutMin",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "swapExactTokensForTokens",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        inputs: [
            {
                name: "amountIn",
                type: "uint256",
            },
            {
                name: "amountOutMin",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amounts",
                type: "uint256[]",
            },
        ],
        inputs: [
            {
                name: "amountOut",
                type: "uint256",
            },
            {
                name: "amountInMax",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "swapTokensForExactETH",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        outputs: [
            {
                name: "amounts",
                type: "uint256[]",
            },
        ],
        inputs: [
            {
                name: "amountOut",
                type: "uint256",
            },
            {
                name: "amountInMax",
                type: "uint256",
            },
            {
                name: "path",
                type: "address[]",
            },
            {
                name: "to",
                type: "address",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "swapTokensForExactTokens",
        stateMutability: "Nonpayable",
        type: "Function",
    },
    {
        stateMutability: "Payable",
        type: "Receive",
    },
];
