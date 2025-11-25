const Joi = require('joi'); //import Joi for schema validation.
const questionModel = require('../models/question.models'); //import the question model.
const coreModel = require('../models/core.models'); //import the core model to check item existence and ownership.
const { checkAuthenticated } = require('../lib/auth');

//Ask a question about an item.
const askQuestionForItem = (req, res) => {
    const askedByUserId = req.user_id; //get user ID from authenticated request - required to validate ownership later.
    const item_id = parseInt(req.params.item_id, 10);
    if (isNaN(item_id)) {
        return res.status(400).send({ error_message: "Invalid item ID" });
    }

    //Define schema for validating request body - working on 500 characters length.
    const schema = Joi.object({
        question_text: Joi.string().max(500).required()
    });

    //Validate request body against schema.
    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).send({ error_message: error.details[0].message });
    }

    const { question_text } = value;
    const user_id = req.user_id; //get user ID from authenticated request.

    //Check if item exists before asking question.
    coreModel.getItemById(item_id, (err, item) => {
        if (err) {
            return res.status(500).send({ error_message: "Database error checking item existence" });
        }
        if (!item) {
            return res.status(404).send({ error_message: "Item not found" });
        }
        //Validate the question to be created is not from the owner who listed the item for sale, then create the question.
        if (item.creator_id === askedByUserId) {
            return res.status(403).send({ error_message: "You cannot ask a question on your own item" });
        }
        //If validation passes, create the question.
        questionModel.createQuestion(user_id, item_id, question_text, (err, result) => {
            if (err) {
                return res.status(500).send({ error_message: "Database error creating question" });
            }
            return res.status(200).send({ question_id: result.question_id });
        });
    });
};

const getQuestionsForItem = (req, res) => {
    const item_id = parseInt(req.params.item_id, 10);
    if (isNaN(item_id)) {
        return res.status(400).send({ error_message: "Invalid item ID" });
    }

    //Check if item exists before retrieving questions.
    coreModel.getItemById(item_id, (err, item) => {
        if (err) {
            return res.status(500).send({ error_message: "Database error checking item existence" });
        }
        if (!item) {
            return res.status(404).send({ error_message: "Item not found" });
        }

        //If item exists, retrieve all questions related to it.
        questionModel.getQuestionsByItemId(item_id, (err, questions) => {
            if (err) {
                return res.status(500).send({ error_message: "Database error retrieving questions" });
            }
            if (!questions || questions.length === 0) {
                return res.status(200).send([]); //return empty array if no questions found.
            }
            const questionList = [];
            for(let i = 0; i < questions.length; i++) {
                questionList.push({
                    question_id: questions[i].question_id,
                    question_text: questions[i].question,
                    answer_text: questions[i].answer
                });
            }
            return res.status(200).send(questionList);
        });
    });
};

//Answer a question about an item - only the item owner can answer.
const answerQuestionForItem = (req, res) => {
    // const item_id = parseInt(req.params.item_id, 10);
    const question_id = parseInt(req.params.question_id, 10);
    if (isNaN(question_id)) {
        return res.status(400).send({ error_message: "Invalid question ID" });
    }

    //Define schema for validating request body - assume 500 character length.
    const schema = Joi.object({
        answer_text: Joi.string().max(500).required()
    });

    //Validate request body against schema.
    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).send({ error_message: error.details[0].message });
    }

    const { answer_text } = value;
    const user_id = req.user_id; //get user ID from authenticated request. Needed to validate ownership.

    //First get the questions to find out which item it belongs to.
    questionModel.getQuestionById(question_id, (err, question) => {
        if (err) {
            return res.status(500).send({ error_message: "Database error checking question" });
        }
        if (!question) {
            return res.status(404).send({ error_message: "Question not found" });
        }

    //Secondly, we check if item exists and user is the owner before answering question.
    coreModel.getItemById(question.item_id, (err, item) => {
        if (err) {
            return res.status(500).send({ error_message: "Database error checking item existence" });
        }
        if (!item) {
            return res.status(404).send({ error_message: "Item not found" });
        }

        //Check the owner who listed the item for sale is correct. THEN allow them to answer the question.
        if (item.creator_id !== user_id) {
            return res.status(403).send({ error_message: "Only the seller can answer questions on their items" });
        }
        //If validation passes, answer the question.
        questionModel.answerQuestion(question_id, answer_text, (err, result) => {
            if (err) {
                return res.status(500).send({ error_message: "Database error answering question" });
            }
            if (!result) {
                return res.status(404).send({ error_message: "No questions found for this item" });
            }
            return res.status(200).send({ message: "Question answered successfully" });
        });
    });
});
}

module.exports = {
    askQuestionForItem,
    getQuestionsForItem,
    answerQuestionForItem
};