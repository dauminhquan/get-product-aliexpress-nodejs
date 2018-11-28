let mongoose = require('mongoose');

let Schema = new mongoose.Schema({
    root_url: {
        type:String,
        required: true,
        unique: true
    }
}, {collection: 'root_urls'});

let Products = module.exports = mongoose.model('RootUrl', Schema);
