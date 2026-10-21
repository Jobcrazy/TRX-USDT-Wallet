const crypto = require("crypto");

const newToken = () => crypto.randomBytes(24).toString("hex");
const sessionExpiresAt = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

module.exports = { newToken, sessionExpiresAt };
