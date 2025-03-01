const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const error_code = require("./errorCode");
const User = require("../model/user");
const { v4: uuidv4 } = require("uuid");

const Utils = {
    //Create time display
    dateFtt: function (fmt, date) {
        let o = {
            "M+": date.getMonth() + 1, //Month
            "d+": date.getDate(), //Day
            "h+": date.getHours(), //Hour
            "m+": date.getMinutes(), //Minute
            "s+": date.getSeconds(), //Second
            "q+": Math.floor((date.getMonth() + 3) / 3), //Quarter
            S: date.getMilliseconds(), //Milliseconds
        };
        if (/(y+)/.test(fmt))
            fmt = fmt.replace(
                RegExp.$1,
                (date.getFullYear() + "").substr(4 - RegExp.$1.length)
            );
        for (let k in o)
            if (new RegExp("(" + k + ")").test(fmt))
                fmt = fmt.replace(
                    RegExp.$1,
                    RegExp.$1.length == 1
                        ? o[k]
                        : ("00" + o[k]).substr(("" + o[k]).length)
                );
        return fmt;
    },
    crtTimeFtt: function () {
        let crtTime = new Date();
        return this.dateFtt("yyyy-MM-dd hh:mm:ss", crtTime);
    },
    crtTimeMs: function () {
        let crtTime = new Date();
        return this.dateFtt("hh-mm-ss-S", crtTime);
    },
    crtTimeDate: function () {
        let crtTime = new Date();
        return this.dateFtt("yyyy-MM-dd", crtTime);
    },
    mkdirsSync: function (dirpath, mode) {
        if (!fs.existsSync(dirpath)) {
            let pathtmp;
            dirpath.split(path.sep).forEach(function (dirname) {
                if (dirname === "") {
                    dirname = "/";
                }
                if (pathtmp) {
                    pathtmp = path.join(pathtmp, dirname);
                } else {
                    pathtmp = dirname;
                }
                if (!fs.existsSync(pathtmp)) {
                    if (!fs.mkdirSync(pathtmp, mode)) {
                        return false;
                    }
                }
            });
        }
        return true;
    },
    // API send result response
    SendResult: function (res, data) {
        let result = {
            code: error_code.error_success.code,
            message: error_code.error_success.message,
        };

        if (typeof data === "object") {
            result.data = data;
        }

        res.send(result);
    },
    // API send error response
    SendError: function (res, err) {
        let result = {
            code: err && err.code ? err.code : error_code.error_unknown.code,
            type: err && err.type ? err.type : error_code.error_unknown.type,
            message:
                err && err.message
                    ? err.message
                    : error_code.error_unknown.message,
        };
        res.send(result);
    },
    // Calculate MD5 for file storage
    CalcFileMD5: function (filePath) {
        return new Promise(function (resolve, reject) {
            const stream = fs.createReadStream(filePath);
            const hash = crypto.createHash("md5");
            stream.on("data", (chunk) => {
                hash.update(chunk, "utf8");
            });
            stream.on("end", () => {
                const md5 = hash.digest("hex");
                stream.close();
                resolve(md5);
            });
            stream.on("error", (err) => {
                reject(err);
            });
        });
    },
    CalcStringMD5: function (s) {
        let c = crypto.createHash("md5");
        c.update(s);
        return c.digest("hex");
    },
    GetCurUser: async function (req) {
        return await User.findOne({
            where: {
                token: req.headers.token,
            },
        });
    },
};

module.exports = Utils;
