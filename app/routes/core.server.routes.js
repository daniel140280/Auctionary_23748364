const core = require('../controllers/core.controller');
const { checkAuthenticated } = require('../lib/auth');

module.exports = function(app) {

    app.route('/search')
        .get(core.itemSearch);

    app.route('/item')
        .post(core.createItem);
    
    app.route('/item/:item_id')
        .get(core.getItemDetails);
        
    app.route('/item/:item_id/bid')
        .post(core.bidOnItem)
        .get(core.bidHistory);

    };