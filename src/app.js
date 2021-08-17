const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);

require('./rest')(app);
require('./websocket')(server);

const port = 8000

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});