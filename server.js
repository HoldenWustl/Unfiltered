const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const { PeerServer } = require('peer');

// Store connected users and their paired information
let users = [];  // Active users in the system, waiting or paired
let pairs = [];  // Paired users

app.use(express.static('public')); // Serve static files from the public folder

// Route for the chat page
app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/public/chat.html');
});

// Handle user connections
io.on('connection', (socket) => {
  console.log('A user connected');

  let pairedUserName = null;

  // When a user sends their username and joins chat
  socket.on('joinChat', (userName) => {
    // Add the user with their socket and username
    users.push({ socket, userName });

    // Try to pair the user with another if there's at least one more user in the queue
    if (users.length > 1) {
      const pair = users.find(user => user.socket !== socket);
      if (pair) {
        pairedUserName = pair.userName;

        // Notify both users that they've been paired
        socket.emit('paired', pairedUserName);  // Send the other user's name to the first user
        pair.socket.emit('paired', userName);  // Send the current user's name to the second user

        // Add this pair to the pairs list
        pairs.push({ socket1: socket, socket2: pair.socket });

        // Remove both users from the waiting list
        users = users.filter(user => user.socket !== socket && user.socket !== pair.socket);
      }
    } else {
      // If no pair is available, let the user know they are waiting
      socket.emit('waitingForPair');
    }
  });

  // When a user sends a message
  socket.on('sendMessage', (message) => {
    console.log(`Received message from ${socket.id}: ${message}`);
    
    // Find the paired user and broadcast the message
    const pair = pairs.find(p => p.socket1 === socket || p.socket2 === socket);
    if (pair) {
      const recipientSocket = pair.socket1 === socket ? pair.socket2 : pair.socket1;
      console.log(`Sending message to socket: ${recipientSocket.id}`);  // Debug line
      
      // Send message to the paired user
      recipientSocket.emit('receiveMessage', message);
    } else {
      console.log('No pair found for this user');
    }
  });
  

  // Disconnect event
  socket.on('disconnect', () => {
    console.log('A user disconnected');

    // Find the pair and notify the other user of the disconnection
    const pair = pairs.find(p => p.socket1 === socket || p.socket2 === socket);
    if (pair) {
      const otherSocket = pair.socket1 === socket ? pair.socket2 : pair.socket1;
      otherSocket.emit('disconnected');  // Notify the other user that their pair has disconnected

      // Remove the pair from the pairs list
      pairs = pairs.filter(p => p !== pair);
    }

    // Remove the user from the users array
    users = users.filter(user => user.socket !== socket);

    // If there are still users waiting, pair the remaining one with a new user
    if (users.length > 0) {
      const remainingUser = users[0];  // There should only be one user left after disconnection
      remainingUser.socket.emit('waitingForPair'); // Notify that they are waiting for a new pair
    }
  });
});

const peerServer = PeerServer({ 
  port: 9000, 
  path: '/myapp', // URL path for PeerJS server
  debug: true 
});

app.get('/video', (req, res) => {
  res.sendFile(__dirname + '/video.html');
});

let videoQueue = [];

io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle user joining the video chat
  socket.on('joinVideoChat', ({ userName, age }) => {
    socket.isRefreshing = false;
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

  // Handle user leaving the video chat
  socket.on('leaveVideoChat', () => {
    // Ensure user is removed from the queue on leave
    videoQueue = videoQueue.filter(s => s !== socket);
  
    if (socket.partner) {
      socket.partner.emit('videoUserLeft');
      socket.partner.partner = null;
  
      // Push partner back into the queue if not already in it
      if (!videoQueue.includes(socket.partner)) {
        videoQueue.push(socket.partner);
        socket.partner.emit('waitingForVideoPair', false);
      }
    }
  
    // Reset the partner reference
    socket.partner = null;
  });

  // Handle user disconnecting
  socket.on('disconnect', () => {
    // Remove user from the video queue
    videoQueue = videoQueue.filter(s => s !== socket);
  
    if (socket.isRefreshing) {
      // Skip further processing if it's a refresh
      return;
    }
  
    // Handle partner-related logic when disconnecting
    if (socket.partner) {
      // Inform the partner that the user has disconnected
      socket.partner.emit('videoUserLeft');
      socket.partner.partner = null;
  
      // Only push partner back to the queue if not already in it
      if (!videoQueue.includes(socket.partner)) {
        videoQueue.push(socket.partner);
        socket.partner.emit('waitingForVideoPair', false);
      }
    }
  
    // Reset the socket's partner
    socket.partner = null;
  });

  // Relay WebRTC signaling messages
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


// Start the server on port 3000
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
