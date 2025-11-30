const question = require('../controllers/question.controller');
const { checkAuthenticated } = require('../lib/auth');

module.exports = function(app) {

    // Questions about items
    app.route('/item/:item_id/question')
        .post(checkAuthenticated, question.askQuestionForItem)
        .get(question.getQuestionsForItem);
    
    // Answer a specific question
    app.route('/question/:question_id')
        .post(checkAuthenticated, question.answerQuestionForItem);

    };