const crypto = require("crypto");
const config = require("config");

const newToken = () => crypto.randomBytes(24).toString("hex");
const sessionExpiresAt = () => new Date(Date.now() + config.get("security.session_hours") * 60 * 60 * 1000);

module.exports = { newToken, sessionExpiresAt };
