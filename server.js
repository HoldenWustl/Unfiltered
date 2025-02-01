const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 9000;

// Attach PeerJS server to the existing HTTP server
const peerServer = ExpressPeerServer(server, {
  path: '/myapp'
});
app.use('/peerjs', peerServer);

// Serve static files
app.use(express.static('public'));

// Route for the chat page
app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/public/chat.html');
});

// Route for the video chat page
app.get('/video', (req, res) => {
  res.sendFile(__dirname + '/public/video.html');
});

let users = [];  // Active users in the system, waiting or paired
let pairs = [];  // Paired users
let videoQueue = [];  // Video chat queue

io.on('connection', (socket) => {
  console.log('A user connected');

  let pairedUserName = null;

  // When a user joins the chat
  socket.on('joinChat', (userName) => {
    users.push({ socket, userName });

    if (users.length > 1) {
      const pair = users.find(user => user.socket !== socket);
      if (pair) {
        pairedUserName = pair.userName;

        socket.emit('paired', pairedUserName);
        pair.socket.emit('paired', userName);

        pairs.push({ socket1: socket, socket2: pair.socket });

        users = users.filter(user => user.socket !== socket && user.socket !== pair.socket);
      }
    } else {
      socket.emit('waitingForPair');
    }
  });

  // Handle chat messages
  socket.on('sendMessage', (message) => {
    console.log(`Received message from ${socket.id}: ${message}`);

    const pair = pairs.find(p => p.socket1 === socket || p.socket2 === socket);
    if (pair) {
      const recipientSocket = pair.socket1 === socket ? pair.socket2 : pair.socket1;
      recipientSocket.emit('receiveMessage', message);
    } else {
      console.log('No pair found for this user');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');

    const pair = pairs.find(p => p.socket1 === socket || p.socket2 === socket);
    if (pair) {
      const otherSocket = pair.socket1 === socket ? pair.socket2 : pair.socket1;
      otherSocket.emit('disconnected');
      pairs = pairs.filter(p => p !== pair);
    }

    users = users.filter(user => user.socket !== socket);
    if (users.length > 0) {
      users[0].socket.emit('waitingForPair');
    }

    // Handle video queue cleanup
    videoQueue = videoQueue.filter(s => s !== socket);
    if (socket.partner) {
      socket.partner.emit('videoUserLeft');
      socket.partner.partner = null;

      if (!videoQueue.includes(socket.partner)) {
        videoQueue.push(socket.partner);
        socket.partner.emit('waitingForVideoPair', false);
      }
    }
    socket.partner = null;
  });

  // Video chat pairing
  socket.on('joinVideoChat', ({ userName, age }) => {
    socket.userName = userName;
    socket.age = age;
    videoQueue.push(socket);

    if (videoQueue.length >= 2) {
      const user1 = videoQueue.shift();
      const user2 = videoQueue.shift();

      user1.partner = user2;
      user2.partner = user1;

      user1.emit('pairedForVideo', { userName: user2.userName, age: user2.age });
      user2.emit('pairedForVideo', { userName: user1.userName, age: user1.age });
    } else {
      socket.emit('waitingForVideoPair', false);
    }
  });

  socket.on('leaveVideoChat', () => {
    videoQueue = videoQueue.filter(s => s !== socket);
    if (socket.partner) {
      socket.partner.emit('videoUserLeft');
      socket.partner.partner = null;

      if (!videoQueue.includes(socket.partner)) {
        videoQueue.push(socket.partner);
        socket.partner.emit('waitingForVideoPair', false);
      }
    }
    socket.partner = null;
  });

  // WebRTC signaling
  socket.on('offer', (offer) => {
    if (socket.partner) {
      socket.partner.emit('offer', offer);
    }
  });

  socket.on('answer', (answer) => {
    if (socket.partner) {
      socket.partner.emit('answer', answer);
    }
  });

  socket.on('candidate', (candidate) => {
    if (socket.partner) {
      socket.partner.emit('candidate', candidate);
    }
  });

  socket.on('refresh', () => {
    socket.isRefreshing = true;
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
