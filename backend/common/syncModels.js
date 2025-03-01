// Models, you must add all models here
const User = require("../model/user");
const Wallet = require("../model/wallet");
const sequelize = require("./sequelize");
const utils = require("./utils");

// Sync Models
async function syncModels() {
    try {
        // Define relationship
        User.hasMany(Wallet, {
            onDelete: "RESTRICT",
            onUpdate: "RESTRICT",
        });
        Wallet.belongsTo(User);

        await sequelize.sync({ alter: true });
        console.log("Sync Model Complete!");
    } catch (err) {
        console.log(err);
    }
}

module.exports = syncModels;
