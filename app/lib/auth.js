const users = require('../models/user.models');

const checkAuthenticated = (req, res, next) => {
    let token = req.get('X-Authorization');

    users.getIdFromToken(token, (err, userId) => {
        if(err || userId == null) { 
            return res.status(401).send({ error_message: "Unauthorized" }); 
        }
        next();
    });
};

module.exports = {
    checkAuthenticated: checkAuthenticated
};