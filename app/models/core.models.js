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
const placeBid = (item_id, user_id, amount, callback) => {
    const timestamp = Math.floor(Date.now() / 1000); // current timestamp in seconds would be needed to compare bid times.

    const placeBidQuery = `
        INSERT INTO bids (item_id, user_id, amount, timestamp)
        VALUES (?, ?, ?, ?)
    `;

    const params = [item_id, user_id, amount, timestamp];

    db.run(placeBidQuery, params, function(err) {
        if (err) return callback(err);
        return callback(null, "Bid received");
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

// const placeBid = (item_id, user_id, amount, callback) => {
//     // 1) Verify the item exists and get item details (creator_id, end_date, starting_bid)
//     const getItemQuery = `SELECT item_id, creator_id, starting_bid, end_date FROM items WHERE item_id = ?`;
//     db.get(getItemQuery, [item_id], (err, itemRow) => {
//         if (err) return callback(err);                  // DB error
//         if (!itemRow) return callback(new Error('Item not found')); // item does not exist

//         // 2) Check seller is not bidding (optional if controller already checked)
//         if (itemRow.creator_id === user_id) {
//             return callback(new Error('You are the seller')); // controller can map to 403
//         }

//         // 3) Check auction hasn't ended (end_date is stored as UNIX seconds)
//         const now = Math.floor(Date.now() / 1000);
//         if (now > itemRow.end_date) {
//             return callback(new Error('Auction ended'));
//         }

//         // 4) Get current highest bid (if any). If none, current = starting_bid
//         const highestBidQuery = `
//             SELECT amount FROM bids
//             WHERE item_id = ?
//             ORDER BY amount DESC
//             LIMIT 1
//         `;
//         db.get(highestBidQuery, [item_id], (err2, bidRow) => {
//             if (err2) return callback(err2); // DB error

//             const current = bidRow ? bidRow.amount : itemRow.starting_bid;

//             // 5) Compare amounts
//             if (amount <= current) {
//                 return callback(new Error('Bid too low'));
//             }

//             // 6) Insert the new bid
//             const timestamp = Math.floor(Date.now() / 1000);
//             const insert = `INSERT INTO bids (item_id, user_id, amount, timestamp) VALUES (?, ?, ?, ?)`;
//             db.run(insert, [item_id, user_id, amount, timestamp], function(insertErr) {
//                 if (insertErr) return callback(insertErr);

//                 // success: return last inserted row id (not strictly necessary)
//                 return callback(null, { bid_id: this.lastID });
//             });
//         });
//     });
// };