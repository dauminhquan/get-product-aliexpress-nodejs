let mongoose = require('mongoose');

let Schema = new mongoose.Schema({
    id: {
        type: Number,
        unique: true,
        required: true
    },
    block:{
        type: Number,
        required: true,
        default: 0
    },
}, {collection: 'searches'});

let SearchKeyword = module.exports = mongoose.model('SearchKeyword', Schema);
