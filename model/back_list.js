let mongoose = require('mongoose');

let Schema = new mongoose.Schema({
    asin: {
        type: String,
        unique: true,
        required: true
    }
}, {collection: 'back_lists'});

let BackLists = module.exports = mongoose.model('BackList', Schema);
