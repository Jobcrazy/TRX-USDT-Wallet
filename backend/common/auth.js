const utils = require("./utils");
const error_code = require("./errorCode");
const User = require("../model/user");

/*
 * This function should be added for any routers when we want to
 * check if a user has logged in.
 */
module.exports = async function (req, res, next) {
    try {
        if (!req.headers.token)
            return utils.SendError(res, error_code.error_login);
        let user = await User.findOne({
            where: {
                token: req.headers.token,
            },
        });
        if (!user) utils.SendError(res, error_code.error_login);
        else next();
    } catch (error) {
        utils.SendError(res, error);
    }
};
