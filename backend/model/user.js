const { DataTypes, Sequelize } = require("sequelize");
const sequelize = require("../common/sequelize");

const User = sequelize.define(
    "user",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: Sequelize.UUIDV4, // Generate a UUID with Sequelize.UUIDV4
            primaryKey: true, // Primary key
            allowNull: false, // Required
        },
        username: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        token: {
            type: DataTypes.STRING(60),
            allowNull: false,
        },
        tokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        biometricSecretHash: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        mnemonic: {
            type: DataTypes.STRING(512),
            allowNull: true,
        },
        seed: {
            type: DataTypes.STRING(512),
            allowNull: true,
        },
        password: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },
        secret: {
            type: DataTypes.STRING(16),
            allowNull: true,
        },
    },
    {
        timestamps: false,
        indexes: [
            { fields: ["username"], unique: true },
            { fields: ["token"], unique: true },
        ],
    }
);

module.exports = User;
