const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cron = require("./common/cron");
const syncModels = require("./common/syncModels");
const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");
const walletRouter = require("./routes/wallet");
const tronRouter = require("./routes/wallet/tron");
const tronSwapRouter = require("./routes/wallet/tron/swap");
const tronStakeRouter = require("./routes/wallet/tron/stake");
const trxRouter = require("./routes/wallet/tron/tokens/trx");
const usdtRouter = require("./routes/wallet/tron/tokens/usdt");
const app = express();

app.set("trust proxy", 1);
app.use(logger("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Allow crossed domain requests
app.all("*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Sync Models
syncModels();

// Define Routers
app.use("/", indexRouter);
app.use("/api/user", userRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/wallet/tron", tronRouter);
app.use("/api/wallet/tron/swap", tronSwapRouter);
app.use("/api/wallet/tron/stake", tronStakeRouter);
app.use("/api/wallet/tron/trx", trxRouter);
app.use("/api/wallet/tron/usdt", usdtRouter);
module.exports = app;
