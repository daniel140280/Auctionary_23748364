const users = require('../controllers/user.controller');

module.exports = function(app) {

    app.route('/users')
        .post(users.createUser);

    };

// const express = require('express');
// const router = express.Router();
// const usersController = require('./users.controllers');

// // POST /users - Create a new user account
// router.post('/', usersController.createUser);

// module.exports = router;
