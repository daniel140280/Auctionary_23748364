//Models handle user-related database operations.
const db = require('../../database'); //imports the database connection.

//create a new item for auction.
const createItem = (creator_id, name, description, starting_bid, end_date, callback) => {
    const start_date = Math.floor(Date.now() / 1000); // current timestamp in seconds, which is important in an auction system.

    const createItemQuery = `
        INSERT INTO items (creator_id, name, description, starting_bid, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [creator_id, name, description, starting_bid, start_date, end_date];

    db.run(createItemQuery, params, function(err) {
        if (err) return callback(err);
        return callback(null, { item_id: this.lastID });
    });
};

//Get item details by ID.
const getItemById = (item_id, callback) => {
    const getItemQuery = `
        SELECT i.item_id, i.name, i.description, i.starting_bid, i.start_date, i.end_date,
        i.creator_id, u.first_name, u.last_name
        FROM items i
        JOIN users u ON i.creator_id = u.user_id
        WHERE i.item_id = ?
    `;

    db.get(getItemQuery, [item_id], (err, row) => {
        if (err) return callback(err);
        return callback(null, row);
    });
};

//Place a bid on an item.
const placeBid = (item_id, user_id, amount, timestamp, callback) => {
    //const timestamp = Math.floor(Date.now() / 1000); // current timestamp in seconds would be needed to compare bid times.

    const placeBidQuery = `
        INSERT INTO bids (item_id, user_id, amount, timestamp)
        VALUES (?, ?, ?, ?)
    `;

    const params = [item_id, user_id, amount, timestamp];

    db.run(placeBidQuery, params, function(err) {
        if (err) return callback(err);
        return callback(null, {bid_id: this.lastID});
    });
};

//Get bid history for an item.
const getBidHistory = (item_id, callback) => {
    const getBidsQuery = `
        SELECT b.item_id, b.amount, b.timestamp, u.user_id, u.first_name, u.last_name
        FROM bids b
        JOIN users u ON b.user_id = u.user_id
        WHERE b.item_id = ?
        ORDER BY b.amount DESC
    `;

    const rows = [];

    db.each(getBidsQuery, [item_id], (err, row) => {
        //Called for each row in the result set and adds it to the rows array.
        if(err) {
            return callback(err);
        } 
        rows.push(row);
    },
    (err, num) => {
        if(err) {
            return callback(err);
        }
        return callback(null, rows);
    }
);
};

module.exports = {
    createItem,
    getItemById,
    placeBid,
    getBidHistory
};