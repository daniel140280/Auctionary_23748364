// Controller for handling user related requests.
const Joi = require('joi'); //import Joi for schema validation.
const userModel = require('../models/user.models'); //import the users model so the controller can check for existing users and create new ones on the database.
const crypto = require('crypto'); //import crypto library for generating session tokens.

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;

// Schema validation for creating a user request body - if the body does not match this schema, return a 400 error.
const userSchema = Joi.object({
    first_name: Joi.string().min(1).required(),
    last_name: Joi.string().min(1).required(),
    email: Joi.string().email().required(),
    password: Joi.string().pattern(passwordRegex).required().messages({
        'string.pattern.base': 'Password must be 8–16 characters and include uppercase, lowercase, number, and special character.'
    })
});

// Controller function that handles the incoming HTTP request (routes) to create a new user.
const createUser = (req, res) => {
    const { error, value } = userSchema.validate(req.body); //destructure error and value from schema validation result.

    if (error) {
        return res.status(400).send({ error_message: error.details[0].message }); //if validation fails, return 400 with the first error message (now renamed).
    }

    const { first_name, last_name, email, password } = value; //destructure validated values from the request body.

    // Check if email already exists before creating new user.
    userModel.getUserByEmail(email, (err, existingUser) => {
        if (err) {
            return res.status(500).send({ error_message: "Internal database error" });
        }

        if (existingUser) {
            return res.status(400).send({ error_message: "Cannot create user, email already in use" });
        }

        // Assuming no error or existing user with that email, we create new user.
        userModel.createUser(first_name, last_name, email, password, (err, result) => {
            if (err) {
                return res.status(500).send({ error_message: "Internal server error stopping user creation" });
            }

            return res.status(201).send({ user_id: result.user_id });
        });
    });
};

// Schema validation for user ID parameter in the URL.
const userIdSchema = Joi.object({
    user_id: Joi.number().integer().min(1).required()
});

//Controller function to return the user profile including selling and bidding history, based on ID search.
const getUserProfile = (req, res) => {
    //validate the user_id parameter from the URL.
    const { error } = userIdSchema.validate(req.params);
    if (error) {
        return res.status(400).send({ error_message: "Invalid user ID - must be a positive number" });
    }

    //convert user_id from string to integer (base 10).
    const user_id = parseInt(req.params.user_id, 10);//adding the 10 to specify base 10 parsing.

    //whilst parameter is valid, need to check it is a valid ID before we can fetch user profile from the database using the user model.
    userModel.getUserProfileById(user_id, (err, profile) => {
        if (err) {
            return res.status(500).send({ error_message: "Internal database error" });
        }

        if (!profile) {
            return res.status(404).send({ error_message: "User ID not found" });
        }
        //success - return the user profile data.
        return res.status(200).send(profile);
    });
}

// Schema validation for user login.
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().pattern(passwordRegex).required().messages({
        'string.pattern.base': 'Password must be 8–16 characters and include uppercase, lowercase, number, and special character.'
        })
    });

//Controller function for user login using their email and password
const loginUser = (req, res) => {
    //validate the request body against the login schema.
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).send({ error_message: error.details[0].message });
    }

    const { email, password } = value; //destructure validated values from the request body.

    userModel.getUserByEmail(email, (err, user) => {
        if (err) {
            return res.status(500).send({ error_message: "Internal database error error" });
        }

        if (!user) {
            return res.status(400).send({ error_message: "Invalid email or password" });
        }

        if (!userModel.verifyPassword(user.password, user.salt, password)) {
            return res.status(400).send({ error_message: "Invalid email or password" });
        }

        // Generate random session token required when user logged in.
        const token = crypto.randomBytes(16).toString('hex');

        // Save the session token in the database
        userModel.saveSessionToken(user.user_id, token, (err) => {
            if (err) {
                return res.status(500).send({ error_message: "Error saving session token" });
            }

            return res.status(200).send({
                user_id: user.user_id,
                session_token: token
            });
        });
    });
};

//Controller to logout the user from their session.
const logoutUser = (req, res) => {
    //token comes from the Authorization header?
    const token = req.headers['x-authorization'];

    if (!token) {
        return res.status(401).send({ error_message: "Missing session token" });
    }

    userModel.clearSessionToken(token, (err, changes) => {
        if (err) {
            return res.status(500).send({ error_message: "Database error" });
        }

        if (changes === 0) {
            return res.status(401).send({ error_message: "Invalid or expired session token" });
        }

        return res.status(200).send({ message: "Logged out successfully" });
    });
};

module.exports = {
    createUser,
    getUserProfile,
    loginUser,
    logoutUser
};