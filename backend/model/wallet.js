const { DataTypes, Sequelize } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../common/sequelize");

const Wallet = sequelize.define(
    "wallet",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        alias: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        blockchain: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        account: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
        },
        address_index: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
        },
        address: {
            type: DataTypes.STRING(128),
            allowNull: false,
        },
        publicKey: {
            type: DataTypes.STRING(1280),
            allowNull: false,
        },
        privateKey: {
            type: DataTypes.STRING(1280),
            allowNull: false,
        },
        hidden: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        timestamps: false,
        indexes: [
            { fields: ["blockchain", "address"], unique: true },
            { fields: ["userId", "alias"], unique: true },
        ],
    }
);
Wallet.beforeCreate((wallet) => (wallet.id = uuidv4()));

module.exports = Wallet;
