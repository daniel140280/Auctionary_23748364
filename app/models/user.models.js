//Models handle user-related database operations.
const db = require('../../database'); //imports the database connection.
const crypto = require('crypto'); //imports the crypto library used for making salt and hashing passwords.

//Inserts new user into the database - accepts user details and a callback function to run after DB operation completes.
const createUser = (first_name, last_name, email, password, callback) => {
    //create salt and hash the password
    const salt = crypto.randomBytes(64); //generates random 64-byte salt and stored to verify passwords later.
    const hash = getHash(password, salt);//want to hash the salt - creating hex encoded hash through concatenation of the password and salt using magic!
    
    //define our SQL insert statement and parameters for injection to bind (preventing SQL injection)
    const insert = `INSERT INTO users (first_name, last_name, email, password, salt) VALUES (?, ?, ?, ?, ?)`;
    const params = [first_name, last_name, email, hash, salt.toString('hex')];

    // insert user into database
    db.run(insert, params, function(err) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, { user_id: this.lastID });
        }
    });
};

//Function to generate a hash from password and salt - private helper function no need to export.
const getHash = (password, salt) => {
    return crypto.pbkdf2Sync(password, salt, 10000, 256, 'sha256').toString('hex');
};

//HELPER FUNCTIONS FOR USER AUTHENTICATION AND PROFILE RETRIEVAL
//Fetches user by email from the database and accepts email or returns undefined.
const getUserByEmail = (email, callback) => {
    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], (err, row) => {
        callback(err, row);
    });
};

//Get session token from user id from the database.
const getToken = (user_id, callback) => {
    const query = `SELECT session_token FROM users WHERE user_id = ?`;
    db.get(query, [user_id], (err, row) => {
        if (err) {
            return callback(err, null);
        }
        if (!row) {
            return callback(null, null); // No user found with that ID
        }
        callback(null, row.session_token);
    });
};

//Get user_id from session token.
const getIdFromToken = (token, callback) => {
    if(!token) {
        return callback(null, null); // Early verification to check a token is provided.
    }
    const query = `SELECT user_id FROM users WHERE session_token = ?`;
    db.get(query, [token], (err, row) => {
        if (err) {
            return callback(err, null);
        }
        if (!row) {
            return callback(null, null); // No user found with that token
        }
        callback(null, row.user_id);
    });
}

//Authenticate user by email and password.
const authenticateUser = (email, password, callback) => {
    const query = `SELECT user_id, password, salt FROM users WHERE email = ?`;

    db.get(query, [email], (err, row) => {
        if (err) { return callback(err); }
        if (!row) { return callback(404); } // No user found with that email.

        if (row.salt === null) { row.salt = ''; } // Handle case where salt is null (legacy accounts)

        let salt = Buffer.from(row.salt, 'hex');

        if (row.password === getHash(password, salt)) {
            return callback(false, row.user_id); // Password matches
        } else {
            return callback(404); // Password does not match
        }
    });
};

//Used for checking login by password meets criteria of saved hash and salt.
const verifyPassword = (storedHash, storedSalt, inputPassword) => {
    const hash = crypto.createHash('sha256').update(inputPassword + storedSalt).digest('hex');
    return storedHash === hash;
};

//Get users profile including buying and selling history.
const getUserProfileById = (user_id, callback) => {
    //Firstly get users basic info and validate there is a user with that ID.
    const userQuery = `SELECT user_id, first_name, last_name FROM users WHERE user_id = ?`;

    db.get(userQuery, [user_id], (err, userRow) => {
        if (err) {
            return callback(err, null); //initial error due to database issue.
        }
        if (!userRow) {
            return callback(null, null); //second error if no user found by ID passed.
        }

        // Build an object to store all user data.
        const userProfile = {
            user_id: userRow.user_id,
            first_name: userRow.first_name,
            last_name: userRow.last_name,
            selling: [],
            bidding_on: [],
            auctions_ended: []
        };

        // If user exists, fetch selling, bidding history and ended auctions user involved in.
        const sellingQuery = `
            SELECT i.item_id, i.name, i.description, i.end_date, i.creator_id, u.first_name, u.last_name
            FROM items i
            JOIN users u ON i.creator_id = u.user_id
            WHERE i.creator_id = ?;
        `;
        //Passing any selling matches from that user ID to the selling array in the userProfile.
        db.each(sellingQuery, [user_id],
            (err, row) => {
                if (!err && row) userProfile.selling.push(row);
            },
            // This is called when db.each() finishes looping all rows
            () => {
                const biddingQuery = `
                    SELECT DISTINCT i.item_id, i.name, i.description, i.end_date, i.creator_id, u.first_name, u.last_name
                    FROM bids b
                    JOIN items i ON b.item_id = i.item_id
                    JOIN users u ON i.creator_id = u.user_id
                    WHERE b.user_id = ?;
                `;
                //Then getting all items the user has bid on and passing to bidding_on array in the userProfile.
                db.each(biddingQuery, [user_id],
                    (err, row) => {
                        if (!err && row) userProfile.bidding_on.push(row);
                    },
                    // This is called when db.each() finishes looping all rows
                    () => {
                        //Finally, get all auctions by this user ID that have ended and add to auctions_ended array in userProfile.
                        const endedQuery = `
                            SELECT i.item_id, i.name, i.description, i.end_date, i.creator_id, u.first_name, u.last_name
                            FROM items i
                            JOIN users u ON i.creator_id = u.user_id
                            WHERE i.creator_id = ? AND i.end_date < strftime('%s', 'now');
                        `;
                        db.each(endedQuery, [user_id],
                            (err, row) => {
                                if (!err && row) userProfile.auctions_ended.push(row);
                            },
                            () => {
                                //Once all is complete, return the whole user profile.
                                callback(null, userProfile);
                            }
                        );
                    }
                );
            }
        );
    });
};

// Save a new session token when logging in
const saveSessionToken = (user_id, callback) => {
    let token = crypto.randomBytes(16).toString('hex'); //generate the session token.

    const query = `UPDATE users SET session_token = ? WHERE user_id = ?`;

    db.run(query, [token, user_id], function(err) {
        callback(err, token); //return the session token to the controller.
    });
};

// Clear session token on logout
const clearSessionToken = (token, callback) => {
    const query = `UPDATE users SET session_token = NULL WHERE session_token = ?`;
    db.run(query, [token], function(err) {
        callback(err, this.changes); // this.changes = how many rows were updated
    });
};

//export the functions to be used in other parts of the application, mostly the controller.
module.exports = {
    createUser,
    getUserByEmail,
    verifyPassword,
    getUserProfileById,
    getToken,
    getIdFromToken,
    authenticateUser,
    saveSessionToken,
    clearSessionToken
};