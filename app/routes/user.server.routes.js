const users = require('../controllers/user.controller');

module.exports = function(app) {

    app.route('/users')
        .post(users.createUser);

    app.route('/login')
        .post(users.loginUser);
    
    app.route('/logout')
        .post(users.logoutUser);

    app.route('/users/:user_id')
        .get(users.getUserProfile);

    };