// Controller for handling user related requests.
const Joi = require('joi'); //import Joi for schema validation.
const userModel = require('../models/user.models'); //import the users model so the controller can check for existing users and create new ones on the database.

// Schema validation for creating a user request body - if the body does not match this schema, return a 400 error.
const userSchema = Joi.object({
    first_name: Joi.string().min(1).required(),
    last_name: Joi.string().min(1).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
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

        // Assuming all checks pass, create new user.
        userModel.createUser(first_name, last_name, email, password, (err, result) => {
            if (err) {
                return res.status(500).send({ error_message: "Internal server error stopping user creation" });
            }

            return res.status(201).send({ user_id: result.user_id });
        });
    });
};

module.exports = {
    createUser
};