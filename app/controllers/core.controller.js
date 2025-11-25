// Controller for handling core auction event related requests.
const Joi = require('joi'); //import Joi for schema validation.
const coreModel = require('../models/core.models'); //import the core model.
//const userModel = require('../models/user.models'); //import the user model as we need to understand specifics defined elsewhere already.

//Create a new item for sale - requires user to be authenticated using session token.
const createItem = (req, res) => {
    //Define schema for validating request body.
    const schema = Joi.object({
        name: Joi.string().max(100).required(),
        description: Joi.string().max(1000).required(),
        starting_bid: Joi.number().integer().positive().required(),
        end_date: Joi.number().integer().min(Math.floor(Date.now() / 1000) + 60).required() // at least 1 minute in the future
    });

    //const timestamp = Math.floor(Date.now() / 1000); // current timestamp in seconds
    console.log("Current timestamp: " + Math.floor(Date.now() / 1000));
    console.log("Request end_date: " + req.body.end_date);
    console.log("Request body: ", req.body);
    
    //Validate request body against schema.
    const { error, value } = schema.validate(req.body);
    if(error) {
        return res.status(400).send({ error_message: error.details[0].message });
    }

    const { name, description, starting_bid, end_date } = value;
    const user_id = req.user_id; //get user ID from authenticated request.

    //If validation passes, create the item.
    coreModel.createItem(user_id, name, description, starting_bid, end_date, (err, result) => {
        if(err) {
            return res.status(500).send({ error_message: "Database error creating item for sale" });
        }
        return res.status(201).send({ item_id: result.item_id });
    });
};

//Get details of a specific item.
const getItemDetails = (req, res) => {
    const item_id = parseInt(req.params.item_id, 10);
    if(isNaN(item_id)) {
        return res.status(400).send({ error_message: "Invalid item ID" });
    }

    coreModel.getItemById(item_id, (err, item) => {
        if(err) {
            return res.status(500).send({ error_message: "Database error retrieving item details" });
        }
        if(!item) {
            return res.status(404).send({ error_message: "Item not found" });
        }
        coreModel.getBidHistory(item_id, (err2, bids) => {
            if(err2) {
                return res.status(500).send({ error_message: "Database error retrieving bid history" });
            }
            if(bids.length > 0) {
                //Determine the current highest bid.
                item.current_bid = bids[0].amount;
                item.current_bid_holder = {
                    user_id: bids[0].user_id,
                    first_name: bids[0].first_name,
                    last_name: bids[0].last_name
                };
            } else {
                item.current_bid = item.starting_bid; //default to starting bid if no bids placed yet.
                item.current_bid_holder = null; //no bids yet.
            }
        return res.status(200).send(item);
    });
    });
};

//Bid on an item for sale - requires user to be authenticated using session token.
const bidOnItem = (req, res) => {
        const user_id = req.user_id;
        const timestamp = Math.floor(Date.now() / 1000); // current timestamp in seconds would be needed to compare bid times.
        const item_id = parseInt(req.params.item_id, 10);

        if(isNaN(item_id)) {
            return res.status(400).send({ error_message: "Invalid item ID" });
        }

        //Validate bid amount schema.
        const schema = Joi.object({
            amount: Joi.number().integer().positive().required()
        });

        //Validate request body against schema.
        const { error, value } = schema.validate(req.body);
        if(error) {
            return res.status(400).send({ error_message: error.details[0].message });
        }

        const { amount } = value;

        coreModel.getItemById(item_id, (err, item) => {
            if(err) {
                return res.status(500).send({ error_message: "Database error retrieving item details" });
            }
            if(!item) {
                return res.status(404).send({ error_message: "Item not found" });
            }

            //Check if user is trying to bid on their own item.
            if(item.creator_id === user_id) {
                return res.status(403).send({ error_message: "Cannot bid on your own item" });
            }
            //Check if auction has ended or throw an error.
            if(timestamp > item.end_date) {
                return res.status(400).send({ error_message: "Auction has already ended" });
            }

            //Get current highest bid for further validation.
            coreModel.getBidHistory(item_id, (err2, bids) => {
                if(err2) {
                    return res.status(500).send({ error_message: "Database error retrieving bid history" });
                }
                //Validate that the new bid is higher than the current highest bid.
                const highestBid = bids.length > 0 ? bids[0].amount : item.starting_bid;
                if(amount <= highestBid) {
                    return res.status(400).send({ error_message: "Bid too low" });
                }

                //If validation passes, place the bid.
                coreModel.placeBid(item_id, user_id, amount, timestamp, (err3) => {
                    if(err3) {
                        return res.status(500).send({ error_message: "Database error placing bid" });
                    }
                    return res.status(201).send({ message: "Bid Received" });//is this spelt correctly compared to API Hub?
                });
            });
        }
    );
};

//         //If validation passes, place the bid SOME VALUES HERE TO CONFIRM ARE VALID.
//         coreModel.placeBid(item_id, user_id, amount, timestamp, (err) => {
//             if(err) {
//                 if(err.message === "Item not found") {
//                     return res.status(404).send({ error_message: "Item not found" });
//                 } else if(err.message === "Bid too low") {
//                     return res.status(400).send({ error_message: "Bid amount is too low" });
//                 } else if(err.message === "Auction ended") {
//                     return res.status(400).send({ error_message: "Auction has already ended" });
//                 } else {
//                     return res.status(500).send({ error_message: "Database error placing bid" });
//                 }
//             }
//             return res.status(201).send({ message: "Bid placed successfully" });
//         });
// }

//Retrieve bid history for a specific item.
const bidHistory = (req, res) => {
    const item_id = parseInt(req.params.item_id, 10);
    if(isNaN(item_id)) {
        return res.status(400).send({ error_message: "Invalid item ID" });
    }
    //Check if item exists before retrieving bid history.
    coreModel.getItemById(item_id, (err, item) => {
        if(err) {
            return res.status(500).send({ error_message: "Database error checking item" });
        }
        if(!item) {
            return res.status(404).send({ error_message: "Item not found" });
        }
    //Only retrieve bid history if item exists.
    coreModel.getBidHistory(item_id, (err, bids) => {
        if(err) {
                return res.status(500).send({ error_message: "Database error retrieving bid history" });
            }
            return res.status(200).send(bids || []);
    });
});
}

//Search for items with optional filters and pagination.
const itemSearch = (req, res) => {
    const schema = Joi.object({
        q: Joi.string().allow('',null), // search query string. A string used to filter the search end point (i.e., to find specific item)
        status: Joi.string().valid('BID', 'OPEN', 'ARCHIVE'), // filter by auction status.
        limit: Joi.number().integer().min(1).max(100).default(10), // number of results to return.
        offset: Joi.number().integer().min(0).default(0) // number of items to skip before starting to collect the result set.
    });

    const { error, value } = schema.validate(req.query);

    if(error) {
        return res.status(400).send({ error_message: error.details[0].message });
    }

    const { q, status, limit, offset } = value;

    //Get user_id from token if provided (optional authentication)
    const token = req.get('X-Authorization') || req.get('x-authorization');
    //If status filter is used, authentication is required
    if(status && !token) {
        return res.status(400).send({ error_message: "Authentication required to search for items" });
    }

    // If token is provided, get user_id from it
    if(token) {
        const userModel = require('../models/user.models');
        userModel.getIdFromToken(token, (err, user_id) => {
            if(err || !user_id) {
                return res.status(401).send({ error_message: "Invalid session token" });
            }
            //Perform search with authenticated user_id
            coreModel.searchItems(q, status, user_id, limit, offset, (err, results) => {
                if(err) {
                    return res.status(500).send({ error_message: "Database error performing search" });
                }
                return res.status(200).send(results);
            });
        });
    } else {
        //Perform search without user_id for unauthenticated requests
        coreModel.searchItems(q, status, null, limit, offset, (err, results) => {
            if(err) {
                return res.status(500).send({ error_message: "Database error performing search" });
            }
            return res.status(200).send(results);
        });
    }
};

    
//     const user_id = req.user_id || null; //get user ID from authenticated request if available. Can be null for unauthenticated requests.

//     //Validation if status filter used by user not logged in.
//     if(status && !user_id) {
//         return res.status(400).send({ error_message: "Authentication required to search for items" });
//     }

    
// };

module.exports = {
    createItem,
    getItemDetails,
    bidOnItem,
    bidHistory,
    itemSearch
};