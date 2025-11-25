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

// Updating a question with an answer by the owner of the item.
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

// Get a single question by ID
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