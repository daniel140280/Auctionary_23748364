const core = require('../controllers/core.controller');
const { checkAuthenticated } = require('../lib/auth');

module.exports = function(app) {

    // Search for items
    app.route('/search')
        .get(core.itemSearch);

    // Create a new auction item
    app.route('/item')
        .post(checkAuthenticated, core.createItem);
    
    // Get item details
    app.route('/item/:item_id')
        .get(core.getItemDetails);
    
    // Place bid and view bid history for an item 
    app.route('/item/:item_id/bid')
        .post(checkAuthenticated, core.bidOnItem)
        .get(core.bidHistory);

    };