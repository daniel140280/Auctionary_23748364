const question = require('../controllers/question.controller');
const { checkAuthenticated } = require('../lib/auth');

module.exports = function(app) {

    app.route('/item/:item_id/question')
        .post(checkAuthenticated, question.askQuestionForItem)
        .get(question.getQuestionsForItem);
    
    // app.route('/question/:question_id')
    //     .post(checkAuthenticated, question.answerQuestionForItem);

    };