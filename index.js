const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = 65515;

const fs = require('fs');

app.use('/client', express.static(__dirname + '/client'));
app.get('/', (req, res) => {
  res.sendFile('/client/pages/index.html', {root: '.'});
});

let rooms = {};

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    if (socket.room) {
      if (rooms.hasOwnProperty(socket.room) && rooms[socket.room].host === socket.id) {
        if (rooms[socket.room].clients.length <= 0) { delete rooms[socket.room]; return; }
        let index = rooms[socket.room].clients.indexOf(socket.id);
        rooms[socket.room].host = rooms[socket.room].clients[0];
        rooms[socket.room].clients.splice(socket.id, 1);
        socket.to(socket.room).emit('User Left', socket.id);
      } else {
        let index = rooms[socket.room].clients.indexOf(socket.id);
        rooms[socket.room].clients.splice(socket.id, 1);
        socket.to(socket.room).emit('User Left', socket.id);
      }
    }
  });
  socket.on('Join', (code, username) => {
    if (rooms.hasOwnProperty(code)) {
      socket.room = code;
      if (username) {
        socket.username = username;
      } else {
        socket.username = "Anonymous";
      }

      rooms[code].clients.push(socket.id);
      socket.join(code);
      socket.to(code).emit('User Joined', socket.id, username);
    } else {
      socket.room = code;

      if (username) {
        socket.username = username;
      } else {
        socket.username = "Anonymous";
      }

      rooms[code] = { host: socket.id, clients: [] };
      socket.join(code);
      socket.to(code).emit("User Joined", socket.id, username);
    }
  });

  socket.on('Send Offer', (id, desc) => {
    socket.to(id).emit("Got Offer", socket.id, desc);
  });

  socket.on('Send Answer', (id, desc) => {
    socket.to(id).emit("Got Answer", socket.id, desc);
  });

  socket.on('Send Candidate', (id, candidate) => {
    socket.to(id).emit('Got Candidate', socket.id, candidate);
  });
});

server.listen(port, () => {
  console.log('Listening on localhost:' + port);
});
