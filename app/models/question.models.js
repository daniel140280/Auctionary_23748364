const db = require('../../database'); //imports the database connection.

/**
 * Creates a new question for an auction item.
 * @param {number} asked_by - User ID of the person asking
 * @param {number} item_id - Item being questioned
 * @param {string} question_text - The question content
 */
const createQuestion = (asked_by, item_id, question_text, callback) => {
    const createQuestionQuery = `
        INSERT INTO questions (asked_by, item_id, question)
        VALUES (?, ?, ?)
    `;

    const params = [asked_by, item_id, question_text];

    db.run(createQuestionQuery, params, function(err) {
        if (err) {
            return callback(err, null);
        } else {
            return callback(null, { question_id: this.lastID });
        }
    });
};

/**
 * Retrieve all questions for a specific item, ordered by the newest first.
 */
const getQuestionsByItemId = (item_id, callback) => {
    const query = `
        SELECT question_id, question, answer
        FROM questions
        WHERE item_id = ?
        ORDER BY question_id DESC
    `;

    const questions = [];
    db.each(
        query,
        [item_id],
        (err, row) => {
            if (!err && row) {
                questions.push(row);
            }
        },
        (err) => {
            if (err) {
                callback(err, null);
            } else {
                callback(null, questions);
            }
        }
    );
};

/**
 * Updates a question with an answer from the owner of the item.
 */
const answerQuestion = (question_id, answer_text, callback) => {
    const query = `
        UPDATE questions
        SET answer = ?
        WHERE question_id = ?
    `;

    db.run(query, [answer_text, question_id], function(err) {
        if (err) {
            return callback(err, null);
        } 
        //Check if any rows were updated
        if(this.changes === 0) {
            return callback(null, null); // No rows updated, question_id may not exist
        }
        return callback(null, { success: true, changes: this.changes });
    });
}

/**
 * Retrieve a single question by ID.
 */
const getQuestionById = (question_id, callback) => {
    const query = `
        SELECT question_id, item_id, asked_by, question, answer
        FROM questions
        WHERE question_id = ?
    `;

    db.get(query, [question_id], (err, row) => {
        if (err) {
            return callback(err, null);
        }
        return callback(null, row);
    });
};

module.exports = {
    createQuestion,
    getQuestionsByItemId,
    answerQuestion,
    getQuestionById
};