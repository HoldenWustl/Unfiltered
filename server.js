const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const { PeerServer } = require('peer');
server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 125 * 1000;
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
        //socket.emit('gotStar',pairedStars);
        
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

  function findOpponent(socket) {
    const pair = pairs.find(p => p.socket1 === socket || p.socket2 === socket);
    return pair ? (pair.socket1 === socket ? pair.socket2 : pair.socket1) : null;
  }
  
  socket.on('giveStar',(stars)=>{
    const recipientSocket = findOpponent(socket);
    if (recipientSocket){
      recipientSocket.emit('gotStar',stars);
    }
  });
  // When a user sends a message
  socket.on('sendMessage', (message) => {
    const recipientSocket = findOpponent(socket);
    if (recipientSocket){
      recipientSocket.emit('receiveMessage', message);
    }
  });
  
  socket.on('startGame', (data) => {
    console.log(`Game invite from ${data.user} for ${data.game}`);
    const recipientSocket = findOpponent(socket);

    if (recipientSocket) {
      // Send the game invite to both the sender and the receiver
      recipientSocket.emit('startGame', data); // Specify event name
      socket.emit('startGame', data); // Sender also gets confirmation
      // Also notify the sender (so they can see the invite as well)
    } else {
      // If no pair, send a neutral message to the sender
      socket.emit('startGame', { 
        game: data.game, 
        user: data.user,
        message: 'Wait for match!' 
      });
    }
  });

socket.on('gameResponse', (data) => {
  console.log(`${data.user} ${data.accepted ? 'accepted' : 'rejected'} the game`);

  // Find the paired user
  const recipientSocket = findOpponent(socket);
  if (recipientSocket) {
      recipientSocket.emit('gameResponse', data);
      socket.emit('gameResponse', data);
  }
});


socket.on('getCards', (data) => {
  const recipientSocket = findOpponent(socket);
  // Check if a pair exists (both users are matched)
  if (recipientSocket) {
    recipientSocket.emit('updateGameState', { 
      opponentCards: data.cards,
      opponentPoints: data.points || 0
    });
    socket.emit('updateGameState', { 
      opponentCards: null
    });
  }
});

socket.on('playPickCard', (data) => {
  const recipientSocket = findOpponent(socket);
  if(recipientSocket){
    recipientSocket.emit('gotPickPlay',{opponentCard:data});
  }
});


socket.on('playCard', (data) => {
  const recipientSocket = findOpponent(socket);
  if(recipientSocket){
    recipientSocket.emit('gotClashPlay',{opponentCard:data});
  }
});



socket.on('playerStood', (data) => {
  const recipientSocket = findOpponent(socket);
  
  // Check if a pair exists (both users are matched)
  if (recipientSocket) {
    recipientSocket.emit('opponentStood', {
      total: data.total,
      cards: data.cards
    });
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
  socket.on('joinVideoChat', ({ userName, age, stars }) => {
    socket.isRefreshing = false;
    socket.userName = userName;
    socket.age = age;
    socket.stars = stars;
    videoQueue.push(socket);

    if (videoQueue.length >= 2) {
      const user1 = videoQueue.shift();
      const user2 = videoQueue.shift();

      user1.partner = user2;
      user2.partner = user1;

      user1.emit('pairedForVideo', { userName: user2.userName, age: user2.age, stars: user2.stars });
      user2.emit('pairedForVideo', { userName: user1.userName, age: user1.age, stars: user1.stars });
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


app.use(express.raw({ type: 'application/json' }));
app.get('/info', (req, res) => {
  res.sendFile(__dirname + '/public/info.html');
});

const stripe = require('stripe')('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');
const endpointSecret = 'whsec_1CpFi93bQx3fojwMhbB75n5PkMcTJO8d';
let lastPayment = null;
// Use body-parser to retrieve the raw body as a buffer

io.on("connection", (socket) => {
  console.log("🟢 Client connected to WebSocket");

  // If there's a last successful payment, send it to the new client
  if (lastPayment) {
    socket.emit("payment-success", lastPayment);
    console.log("🔄 Sent last payment event to new client");
    lastPayment = null;
  }

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected");
  });
});

// Create checkout session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    // Manually parse the raw body
    const body = JSON.parse(req.body.toString());

    // Get the product name from the request body
    const { productName } = body;
    if (!productName) {
      return res.status(400).send('Product name is required');
    }

    // Define product details based on the product name
    let productData;
    if (productName === '100 Stars') {
      productData = { name: '100 Stars', description: 'Gain 100 Stars', amount: 5.99 };
    } else if (productName === '200 Stars') {
      productData = { name: '200 Stars', description: 'Gain 200 Stars', amount: 9.99 };
    } else {
      return res.status(400).send('Invalid product name');
    }

    // Create the checkout session using the product data
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productData.name,
              description: productData.description,
            },
            unit_amount: productData.amount * 100, // Convert amount to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://www.unfiltered.chat/info.html',  // Your success URL
      cancel_url: 'https://www.unfiltered.chat/info.html',   // Your cancel URL
    });

    res.json({ id: session.id });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Webhook endpoint to handle Stripe events
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log("Webhook received!");

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Construct the event using raw body and signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Process the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const productName = session.amount_total;
    console.log(`✅ Payment completed for ${session.amount_total / 100} ${session.currency.toUpperCase()}`);
    console.log(`✅ Payment completed for: ${session.customer_details.email}`);
    console.log(`✅ Payment completed for product: ${productName}`);
    lastPayment = { productName: productName };
    io.emit("payment-success", lastPayment);
    
    
   
  }

  res.status(200).send(); // Respond to Stripe to acknowledge receipt of the event
});


const port = process.env.PORT || 10000; // Default to 10000 if PORT isn't set

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});
