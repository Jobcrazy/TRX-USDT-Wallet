const express = require("express");
const router = express.Router();

router.get("/", async (req, res, next) => {
    try {
        res.send("Welcome!");
    } catch (error) {
        utils.SendError(res, error);
    }
});

module.exports = router;
