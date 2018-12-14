let mongoose = require('mongoose');

let Schema = new mongoose.Schema({
    text: {
        type: String,
     
        required: true
    }
}, {collection: 'contact'});

let Contacts = module.exports = mongoose.model('Contact', Schema);
