let sockets = {};
sockets.init = server => {
    const io = require('socket.io')(server);
    let online_users = [];

    io.on('connection', socket => {
        console.log('1 nguoi vua ket noi')
    });
};

module.exports = sockets;
