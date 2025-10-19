// Controller for handling core auction event related requests.
const Joi = require('joi'); //import Joi for schema validation.
const coreModel = require('../models/core.models'); //import the core model.
const userModel = require('../models/user.models'); //import the user model as we need to understand specifics defined elsewhere already.

//CONSIDER IF MOVE TO A HELPER CLASS TO CREATE SEPARATION OF CONCERNS
//Helper function to verify session token of the user from the Header.
const authenticateUser = (req, res, callback) => {
    const token = req.headers['x-authorization'];
    if(!token) {
        return res.status(401).send({ error_message: "Missing session token" });
    } 
    userModel.getIdFromToken(token, (err, user_id) => {
        if(err || !user_id) {
            return res.status(401).send({ error_message: "Invalid or expired session token" });
        } 
        callback(user_id);
    });
}

//Create a new item for sale - requires user to be authenticated using session token.
const createItem = (req, res) => {
    authenticateUser(req, res, (user_id) => {
        //Define schema for validating request body.
        const schema = Joi.object({
            name: Joi.string().max(25).required(),
            description: Joi.string().max(1000).required(),
            starting_bid: Joi.number().integer().positive().required(),
            end_date: Joi.number().integer().min(Math.floor(Date.now() / 1000) + 60).required() // at least 1 minute in the future
        });

        //Validate request body against schema.
        const { error, value } = schema.validate(req.body);
        if(error) {
            return res.status(400).send({ error_message: error.details[0].message });
        }

        const { name, description, starting_bid, end_date } = value;

        //If validation passes, create the item.
        coreModel.createItem(user_id, name, description, starting_bid, end_date, (err, result) => {
            if(err) {
                return res.status(500).send({ error_message: "Database error creating item for sale" });
            }
            return res.status(201).send({ item_id: result.item_id });
        });
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
        return res.status(200).send(item);
    });
};

//Bid on an item for sale - requires user to be authenticated using session token.
const bidOnItem = (req, res) => {
    authenticateUser(req, res, (user_id) => {
        const item_id = parseInt(req.params.item_id, 10);
        if(isNaN(item_id)) {
            return res.status(400).send({ error_message: "Invalid item ID" });
        }

        //Define schema for validating request body.
        const schema = Joi.object({
            amount: Joi.number().integer().positive().required()
        });

        //Validate request body against schema.
        const { error, value } = schema.validate(req.body);
        if(error) {
            return res.status(400).send({ error_message: error.details[0].message });
        }

        const { amount } = value;

        //If validation passes, place the bid SOME VALUES HERE TO CONFIRM ARE VALID.
        coreModel.placeBid(item_id, user_id, amount, (err) => {
            if(err) {
                if(err.message === "Item not found") {
                    return res.status(404).send({ error_message: "Item not found" });
                } else if(err.message === "Bid too low") {
                    return res.status(400).send({ error_message: "Bid amount is too low" });
                } else if(err.message === "Auction ended") {
                    return res.status(400).send({ error_message: "Auction has already ended" });
                } else {
                    return res.status(500).send({ error_message: "Database error placing bid" });
                }
            }
            return res.status(201).send({ message: "Bid placed successfully" });
        });
    });
}

//Retrieve bid history for a specific item.
const bidHistory = (req, res) => {
    const item_id = parseInt(req.params.item_id, 10);
    if(isNaN(item_id)) {
        return res.status(400).send({ error_message: "Invalid item ID" });
    }

    coreModel.getBidHistory(item_id, (err, bids) => {
        if(err) {
            if(err.message === "Item not found") {
                return res.status(404).send({ error_message: "No bids found" });
            } else {
                return res.status(500).send({ error_message: "Database error retrieving bid history" });
            }
        }
        return res.status(200).send(bids);
    });
}

//PLACEHOLDER - to be implemented later
const itemSearch = (req, res) => {
   return res.status(501).send({ message: 'Search functionality coming soon' });
};

module.exports = {
    createItem,
    getItemDetails,
    bidOnItem,
    bidHistory,
    itemSearch
};