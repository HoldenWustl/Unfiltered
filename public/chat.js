// Connect to the Socket.io server
let otherUserName = '';
const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const userName = urlParams.get('userName') || 'User'; // Default to 'User' if not found
let isPaired = false;
// Get the user's name from the URL query string (set default value if missing)
socket.emit('joinChat', userName);
document.querySelector('.chat-header h2').textContent = "Finding someone...";

// Handle pairing event
socket.on('paired', (name) => {
  isPaired = true;
  document.querySelector('.chat-header h2').textContent = `Chatting with ${name}`;
  otherUserName = name;
  appendMessage(`${name} has joined the chat.`, 'neutral');
});

// Handle waiting for a pair
socket.on('waitingForPair', () => {
  document.querySelector('.chat-header h2').textContent = "Waiting for someone to join...";
});


// DOM elements
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const charCount = document.getElementById('char-count');

// Max characters limit
const MAX_CHAR_LIMIT = 200;

function updateCharCount() {
  const remainingChars = MAX_CHAR_LIMIT - messageInput.value.length;
  charCount.textContent = remainingChars;

  // Optionally change color when the limit is close to being reached
  if (remainingChars <= 20) {
    charCount.style.color = "red"; // Warning color
  } else {
    charCount.style.color = "#999"; // Normal color
  }
}

// Function to append a message to the chat display
function appendMessage(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', sender);
  if (sender !== 'neutral') {
    messageElement.style.backgroundColor = isPaired ? 'orange' : 'black';
  }
  // Check if it's the other user's message
  if (sender === 'other') {
    
    const senderNameElement = document.createElement('span');
    senderNameElement.classList.add('sender-name');
    senderNameElement.textContent = `${otherUserName}: `;  // Correct use of otherUserName
    messageElement.appendChild(senderNameElement);
  }

  // For the 'neutral' message (the join message)
  if (sender === 'neutral') {
    messageElement.classList.add('neutral-message'); // Add a special class for neutral messages
    messageElement.textContent = message;
  } else {
    messageElement.textContent += message; // Append the message content
  }

  chatMessages.appendChild(messageElement);

  // Scroll to the latest message
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
// Send message when Enter key is pressed


// Function to send a message to the server
function sendMessage() {
  const messageText = messageInput.value.trim();
  if (messageText !== "") {
    if (messageText.length > MAX_CHAR_LIMIT) {
      alert(`Message is too long! Maximum allowed characters: ${MAX_CHAR_LIMIT}`);
      return; // Stop the function if message is too long
    }

    // Send message to the server
    socket.emit('sendMessage', messageText);

    // Display the user's message
    appendMessage(messageText, 'user', userName);

    // Clear the input field
    messageInput.value = "";
    updateCharCount();
  }
}

// Listen for incoming messages from the server
socket.on('receiveMessage', (message) => {
  appendMessage(message, 'other');
});
// Send message when Enter key is pressed
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // Prevents new lines in the input field
    sendMessage();
  }
});

// Event listener for typing
messageInput.addEventListener('input', updateCharCount);

// Function to go back to the previous page (index.html)
function goBack() {
  window.location.href = "info.html"; // Change to the appropriate page if needed
}

// Listen for the 'disconnected' event when the other user disconnects
socket.on('disconnected', () => {
  isPaired = false; 
  document.querySelector('.chat-header h2').textContent = 'Finding someone...';
  alert('The other user has disconnected. Please wait while we find a new user for you.');
  appendMessage(`${otherUserName} has left the chat.`, 'neutral');
  socket.emit('joinChat', userName); // Re-attempt pairing
});

// Initialize the character count display
updateCharCount();

// Function to toggle the game menu visibility
function toggleGameMenu() {
  const gameMenu = document.getElementById('game-menu');
  gameMenu.style.display = gameMenu.style.display === 'block' ? 'none' : 'block';
}

// Function to handle starting a game (in this case, '21' - Blackjack)
function startGame(gameName) {
  if (gameName === '21') {
    const gameInvite = {
      game: '21',
      user: userName,
      imageUrl: 'icon/21-icon.png', // Replace with actual image URL
    };

    // Send game invite to the other user
    socket.emit('startGame', gameInvite);
  }
}

socket.on('startGame', (data) => {
  const isSender = data.user === userName;
  const inviteContainer = document.createElement('div');
  inviteContainer.classList.add('game-invite');

  // If there is a neutral message (waiting for pair), display it
  if (data.message) {
    appendMessage(data.message, "neutral");
  } else {
    // Show the game invite message
    inviteContainer.innerHTML = `
      <p>${isSender ? `Inviting ${otherUserName} to play <strong>21 (Blackjack)</strong>` : `${data.user} has invited you to play <strong>21 (Blackjack)</strong>`}!</p>
      <img src="${data.imageUrl}" alt="Blackjack" class="game-image">
      <div class="invite-buttons">
        <button class="accept-btn" ${isSender ? 'disabled' : ''} style="${isSender ? 'opacity: 0.5; cursor: not-allowed;' : ''}">Accept</button>
        <button class="reject-btn" ${isSender ? 'disabled' : ''} style="${isSender ? 'opacity: 0.5; cursor: not-allowed;' : ''}">Reject</button>
      </div>
    `;
    chatMessages.appendChild(inviteContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // If player B, allow them to accept/reject
    if (!isSender) {
      inviteContainer.querySelector('.accept-btn').addEventListener('click', () => {
          socket.emit('gameResponse', { accepted: true, game: '21', user: userName });
      });

      inviteContainer.querySelector('.reject-btn').addEventListener('click', () => {
          socket.emit('gameResponse', { accepted: false, game: '21', user: userName });
      });
    }
  }
});

// Remove game invite from both users when game is accepted or rejected
socket.on('removeGameInvite', () => {
  document.querySelectorAll('.game-invite').forEach(invite => invite.remove());
});

// Handle game response (accepted/rejected) - notify both users
socket.on('gameResponse', (data) => {
  const message = `${data.user} ${data.accepted ? 'accepted' : 'rejected'} the game.`;
  appendMessage(message, "neutral");

  // Remove the game invite message after decision
  document.querySelectorAll('.game-invite').forEach(invite => invite.remove());
});

