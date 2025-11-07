const users = require('../controllers/user.controller');
const { checkAuthenticated } = require('../lib/auth');

module.exports = function(app) {

    app.route('/users')
        .post(users.createUser);

    app.route('/login')
        .post(users.loginUser);
    
    app.route('/logout')
        .post(checkAuthenticated, users.logoutUser);

    app.route('/users/:user_id')
        .get(users.getUserProfile);

    };