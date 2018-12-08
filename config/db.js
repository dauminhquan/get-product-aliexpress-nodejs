let db = {};
db.init = config => {
    const mongoose = require('mongoose');
    const { db: { host, port, name } } = config;
    const connectionString = `mongodb://${host}:${port}/${name}`;
    // const connectionString = 'mongodb://dauminhquantlu:Exx5aEKhwq5wbfUY@cluster0-shard-00-00-fjf7b.mongodb.net:27017,cluster0-shard-00-01-fjf7b.mongodb.net:27017,cluster0-shard-00-02-fjf7b.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true'
    mongoose.connect(connectionString,{ useNewUrlParser: true });

    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection mongodb error:'));
    db.once('open', () => console.log('connected to mongodb'));
};

module.exports = db;
