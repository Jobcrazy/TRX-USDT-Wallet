const crypto = require("crypto");

const newSecret = () => crypto.randomBytes(32).toString("hex");
const hashSecret = (secret) =>
    crypto.createHash("sha256").update(secret).digest("hex");

function verifySecret(secret, storedHash) {
    if (
        typeof secret !== "string" ||
        typeof storedHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(secret) ||
        !/^[a-f0-9]{64}$/.test(storedHash)
    )
        return false;
    return crypto.timingSafeEqual(
        Buffer.from(hashSecret(secret), "hex"),
        Buffer.from(storedHash, "hex")
    );
}

module.exports = { newSecret, hashSecret, verifySecret };
