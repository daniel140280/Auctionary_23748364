const db = require('../../database'); //imports the database connection.

//Create a new questions for an item.
const createQuestion = (asked_by, item_id, question_text, callback) => {
    //const timestamp = Math.floor(Date.now() / 1000); // current timestamp in seconds....NEEDED TO CHECK IF AUCTION ENDED?

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

// Retrieve all questions for a specific item.
const getQuestionsByItemId = (item_id, callback) => {
    const query = `
        SELECT question_id, question, answer
        FROM questions
        WHERE item_id = ?
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

// Updating a question with an answer by the owner of the item.
const answerQuestion = (question_id, answer_text, callback) => {
    const query = `
        UPDATE questions
        SET answer = ?
        WHERE question_id = ?
    `;

    db.run(query, [answer_text, question_id], function(err) {
        if (err) {
            return callback(err);
        } else {
            return callback(null);
        }
    });
}

module.exports = {
    createQuestion,
    getQuestionsByItemId,
    answerQuestion
};