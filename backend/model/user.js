const { DataTypes, Sequelize } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../common/sequelize");

const User = sequelize.define(
    "user",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: Sequelize.UUIDV4, // 使用 Sequelize.UUIDV4 来生成 UUID
            primaryKey: true, // 设置为主键
            allowNull: false, // 不允许为空
        },
        username: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        token: {
            type: DataTypes.STRING(60),
            allowNull: false,
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
            type: DataTypes.STRING(16),
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
User.beforeCreate((user) => (user.id = uuidv4()));

module.exports = User;
