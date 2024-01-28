const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const pty = require('node-pty');

app.use(express.static('static'));

io.on('connection', (socket) => {
  console.log('a user connected');
  const term = pty.spawn('docker', ["run", "-it", "--rm", "cocoaxu/cheribsd-purecap"], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: process.env
  });

  term.on('data', (data) => {
    socket.emit('data', data);
  });

  socket.on('data', (data) => {
    term.write(data);
  });

  socket.on('resize', (data) => {
    console.log(data)
    term.resize(data.cols, data.rows);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    term.write(Uint8Array.from([0x01, 'x'.charCodeAt(0)]));
    term.kill(9);
  });

  term.onExit((code, signal) => {
    socket.emit('Process exited with code ' + code);
    socket.disconnect();
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
