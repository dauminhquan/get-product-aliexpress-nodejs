let mongoose = require('mongoose');

let Schema = new mongoose.Schema({
    asin: {
        type: String,
        unique: true,
        required: true
    },
    keyword:{
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    reject: {
        type: Boolean,
        default: false
    },
    rank: {
        type: String,
        required: true
    },
    review: {
        type: Number,
        required: true
    },
    root_url: {
        type:String,
        required: true
    },
    url_found: {
        type: String,
        required: true
    },
    url_product: {
        type: String,
        required: true
    }
}, {collection: 'products'});

let Products = module.exports = mongoose.model('Products', Schema);
