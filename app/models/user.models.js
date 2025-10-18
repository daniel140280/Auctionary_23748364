//Models handle user-related database operations.
const db = require('../../database'); //imports the database connection.
const crypto = require('crypto'); //imports the crypto library used for making salt and hashing passwords.

//Inserts new user into the database - accepts user details and a callback function to run after DB operation completes.
const createUser = (first_name, last_name, email, password, callback) => {
    //create salt and hash the password
    const salt = crypto.randomBytes(16).toString('hex'); //generates random 16-byte salt, converts to hex string and stored to verify passwords later.
    const hash = crypto.createHash('sha256').update(password + salt).digest('hex');//creates hex encoded hash through concatenation of the password and salt using magic!
    
    //define our SQL insert statement and parameters for injection to bind (preventing SQL injection)
    const insert = `INSERT INTO users (first_name, last_name, email, password, salt) VALUES (?, ?, ?, ?, ?)`;
    const params = [first_name, last_name, email, hash, salt];

    // insert user into database
    db.run( insert, params, function(err) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, { user_id: this.lastID });
        }
    });
};


//Fetches user by email from the database and accepts email or returns undefined.
const getUserByEmail = (email, callback) => {
    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], (err, row) => {
        callback(err, row);
    });
};

//Used for checking login by password meets criteria of saved hash and salt.
const verifyPassword = (storedHash, storedSalt, inputPassword) => {
    const hash = crypto.createHash('sha256').update(inputPassword + storedSalt).digest('hex');
    return storedHash === hash;
};

//export the functions to be used in other parts of the application, namely the controller.
module.exports = {
    createUser,
    getUserByEmail,
    verifyPassword
};