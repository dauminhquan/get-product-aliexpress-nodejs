const createError = require('http-errors');
const config = require('./config/index');
const db = require('./config/db');
const serverConfig = require('./config/server');
const modules = require('./config/module');
const app = serverConfig.app;
const server = serverConfig.server;
const sockets = require('./sockets/index');
const indexRouter = require('./routes/index');
//
// sockets.init(server);
modules.init(app);
db.init(config);
const io  = require('socket.io')(server)
io.on('connection', function(socket) {
    console.log('connected socket!');

    socket.on('disconnect', function() {
        console.log('Socket disconnected');
    });
});
app.use((req,res,next) => {
  res.io = io
    next()
})
// All Router
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
module.exports = app;
