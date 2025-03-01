const schedule = require("node-schedule");
const User = require("../model/user");
const { Op } = require("sequelize");
const axios = require("axios");
const utils = require("./utils");

/*

*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    │
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)

*/

axios.defaults.timeout = 5000;
const second = 1;
const minute = second * 60;
const hour = second * 60;
const day = hour * 24;

const CronTask = schedule.scheduleJob("00 */1 * * * *", async function () {
    try {
        // console.log("CronTask...");
    } catch (err) {
        console.log(err);
    }
});

module.exports = { CronTask };
