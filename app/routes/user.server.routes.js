const users = require('../controllers/user.controller');
const { checkAuthenticated } = require('../lib/auth');

module.exports = function(app) {

    // User registration
    app.route('/users')
        .post(users.createUser);

    // User authentication
    app.route('/login')
        .post(users.loginUser);
    
    // User logout - requires user to already be authenticated
    app.route('/logout')
        .post(checkAuthenticated, users.logoutUser);

    // Get user profile by ID
    app.route('/users/:user_id')
        .get(users.getUserProfile);

    };