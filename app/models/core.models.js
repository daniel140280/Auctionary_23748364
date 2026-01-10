const db = require('../../database'); //imports the database connection.

/**
 * Creates a new auction item in the database.
 * Automatically sets start_date to current timestamp.
 */
const createItem = (creator_id, name, description, starting_bid, end_date, callback) => {

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

/**
 * Retrieves item details by ID based on creator information.
 */
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

/**
 * Place a bid on an item and records it in the database.
 */
const placeBid = (item_id, user_id, amount, timestamp, callback) => {

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

/**
 * Retrieves all bid history for an item, ordered by amount (highest first).
 */
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

/**
 * Searches items based on specific criteria.
 * Status filters are as follows:
 * OPEN (user's active listings), 
 * ARCHIVE (user's ended listings), 
 * BID (items user has bid on).
 */
const searchItems = (q, status, user_id, limit, offset, callback) => {
    //An initial implementation which can be mutated later.
    let baseQuery = `
        SELECT i.item_id, i.name, i.description, i.end_date, i.creator_id, u.first_name, u.last_name, 
        (SELECT MAX(amount) FROM bids WHERE item_id = i.item_id) as current_bid
        FROM items i
        JOIN users u ON i.creator_id = u.user_id
    `;
    //Blank parameters enable different search combinations to be built.
    const params = [];
    const conditions = [];
    const currentTime = Math.floor(Date.now() / 1000);

    //Filter based on auction status first - only three options have been provided.
    if(status === 'OPEN' && user_id) {
        conditions.push(`i.creator_id = ?`);
        conditions.push(`i.end_date > ?`);
        params.push(user_id, currentTime);
    } else if(status === 'ARCHIVE' && user_id) {
        conditions.push(`i.creator_id = ?`);
        conditions.push(`i.end_date <= ?`);
        params.push(user_id, currentTime);
    } else if(status === 'BID' && user_id) {
        baseQuery += ` JOIN bids b ON i.item_id = b.item_id `;
        conditions.push(`b.user_id = ?`);
        params.push(user_id);
    }

    //Search on item name or description if 'q' is provided.
    if(q) {
        conditions.push(`LOWER(i.name) LIKE ? OR LOWER(i.description) LIKE ?`);
        params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
    }

    // Build the final query with the conditions.
    // Next limit the number of results and apply offset for pagination, and combine WHERE clauses.
    if(conditions.length > 0) {
        baseQuery += ' WHERE ' + conditions.join(' AND ');
    }
    baseQuery += ' GROUP BY i.item_id ORDER BY i.end_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = [];

    db.each(baseQuery, params, (err, row) => {
        if(err) {
            return callback(err);
        }
        rows.push(row);
    },
    (err) => {
        if(err) {
            return callback(err);
        }
        return callback(null, rows);
    });
};

module.exports = {
    createItem,
    getItemById,
    placeBid,
    getBidHistory,
    searchItems
};