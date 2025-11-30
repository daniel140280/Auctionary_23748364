const users = require('../models/user.models');

/**
 * Middleware added to verify user authentication via session token.
 * Method extracts token from X-Authorization header and validates it.
 * Then, if valid, it will attach user_id to request object.
 */
const checkAuthenticated = (req, res, next) => {
    let token = req.get('X-Authorization') || req.get('x-authorization');

    if (!token) {
        return res.status(401).send({ error_message: "Missing session token" });
    }

    users.getIdFromToken(token, (err, user_id) => {
        if(err || user_id == null) { 
            return res.status(401).send({ error_message: "Unauthorized - invalid or expired session token" }); 
        }
        // Attach userId to request object for downstream use.
        req.user_id = user_id;
        // Move on to the next function in routes handler.
        next(); 
    });
};

module.exports = {
    checkAuthenticated: checkAuthenticated
};