var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const PORT = process.env.PORT || 5000;

app.get('/', function (req, res) {
    res.send('BCO Cloud prototype');
});

const pwd = "123456";

io.on('connection', function (socket) {
    console.log('a user connected with id: ' + socket.id);

    // initialize a timeout of 3 seconds to close the socket connection if no authentication has been performed
    let authenticationTimeout = setTimeout(() => socket.disconnect(true), 3000);

    socket.on('authenticate', function (data) {
        console.log('authenticate with data: ' + data);

        let callback = arguments[arguments.length - 1];
        if (data === pwd) {
            clearTimeout(authenticationTimeout);
            callback('Authentication complete!');
        } else {
            callback('Authentication failed!');
            socket.disconnect(true);
            clearTimeout(authenticationTimeout);
        }
    });

    socket.on('disconnect', () => console.log('socket[' + socket.id + '] disconnected'));
});

http.listen(PORT, function () {
    console.log('listening on: ' + PORT);
});
