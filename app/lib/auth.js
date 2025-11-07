const users = require('../models/user.models');

const checkAuthenticated = (req, res, next) => {
    let token = req.get('X-Authorization') || ('x-authorization');

    users.getIdFromToken(token, (err, userId) => {
        if(err || userId == null) { 
            return res.status(401).send({ error_message: "Unauthorized - invalid or expired session token" }); 
        }
        req.userId = userId;// Attach userId to request object for downstream use.

        next(); //go to the next function in routes handler.
    });
};

module.exports = {
    checkAuthenticated: checkAuthenticated
};