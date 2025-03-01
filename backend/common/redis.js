const config = require("config");
const Redis = require("ioredis");

if (process.env.PHASE === "production")
    config_redis = config.get("production.db.redis");
else config_redis = config.get("development.db.redis");
const redis = new Redis({
    port: config_redis.port,
    host: config_redis.host,
    password: config_redis.password,
});

module.exports = redis;
