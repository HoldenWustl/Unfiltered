// Connect to the Socket.io server
let otherUserName = '';
const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const userName = urlParams.get('userName') || 'User'; // Default to 'User' if not found
let isPaired = false;

function getStarCount() {
  const starCountDiv = document.getElementById("star-count");
  if (starCountDiv) {
    const starCountText = starCountDiv.innerHTML.trim();
    const starCount = parseInt(starCountText.replace("★", "").trim(), 10);
    
    if (!isNaN(starCount)) {
      console.log("Star Count:", starCount);
      return starCount; // Return valid star count
    }
  }
  return null; // Return null if not ready
}

let allowStarCountPass = true;
let otherStarCount = 0;
let checkStarCount;
const otherStarBlock = document.getElementById('other-star-count');

socket.emit('joinChat', userName);
document.querySelector('.chat-header h2').textContent = "Finding someone...";

// Handle pairing event
socket.on('paired', (name) => {
  allowStarCountPass = true;
  isPaired = true;
  document.querySelector('.chat-header h2').textContent = `Chatting with ${name}`;
  otherUserName = name;
  appendMessage(`${name} has joined the chat.`, 'neutral');
});
socket.on('gotStar',(star) =>{
  
  console.log("Other Star Count: ",star);
  if(allowStarCountPass){
  socket.emit('giveStar', getStarCount());
  allowStarCountPass = false;
  otherStarCount = star;
  otherStarBlock.innerHTML = `${otherStarCount} &#9733;`;}
});
// Handle waiting for a pair
socket.on('waitingForPair', () => {
  document.querySelector('.chat-header h2').textContent = "Waiting for someone to join...";
});

// Check every 100ms until starCount is loaded
checkStarCount = setInterval(() => {
  const starCount = getStarCount();
  if (starCount !== null) {
    clearInterval(checkStarCount); // Stop checking
    socket.emit('giveStar', starCount); // Emit only after star count is ready
  }
}, 100);
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
  document.dispatchEvent(new CustomEvent("updatePoints", {
    detail: { name: userName, points: -1*gameWager }
  }));
  window.location.href = "info.html"; // Change to the appropriate page if needed
}

// Listen for the 'disconnected' event when the other user disconnects
socket.on('disconnected', () => {
  isPaired = false; 
  document.querySelector('.chat-header h2').textContent = 'Finding someone...';
  alert('The other user has disconnected. Please wait while we find a new user for you.');
  appendMessage(`${otherUserName} has left the chat.`, 'neutral');
  
  socket.emit('joinChat', userName); // Re-attempt pairing
  otherStarCount = 0;
  wagerAmount.innerHTML =  `0 &#9733;`;
  otherStarBlock.innerHTML = `0 &#9733;`;
  if (currentlyInGame){
    checkWin();
    
  }
});

// Initialize the character count display
updateCharCount();

// Function to toggle the game menu visibility
function toggleGameMenu() {
  const gameMenu = document.getElementById('game-menu');
  gameMenu.style.display = gameMenu.style.display === 'flex' ? 'none' : 'flex';
  
}
setInterval(() => {
  wagerSlider.min = 0;
  wagerSlider.max = Math.min(getStarCount(), otherStarCount);
}, 500); // Adjust the interval as needed

// Function to handle starting a game (in this case, '21' - Blackjack)
function sendGameInvite(gameName) {
  let gameInvite;
  if (gameName === '21') {
     gameInvite = {
      game: '21',
      user: userName,
      imageUrl: 'icons/21-icon.png', // Replace with actual image URL
      wager: getWager()
    };}
  if (gameName === 'cardClash') {
    gameInvite = {
      game: 'Card Clash',
      user: userName,
      imageUrl: 'icons/cardclash-icon.png', // Replace with actual image URL
      wager: getWager()
    };
  }

    const existingGame = document.querySelector('.game');

if (!existingGame) {
    // No game div exists, start a new game
    socket.emit('startGame', gameInvite);
} else if (existingGame.classList.contains('old')) {
    // Game div exists but is marked as "old", so remove it and start a new game
    existingGame.remove();
    socket.emit('startGame', gameInvite);
}
// If a game div exists and isn't marked as "old", do nothing.

}

let opponentCardHTML = ''; // Default to an empty string
let numOpponentCards = 1;
let stand = false;
let bust = false;
let opponentTotal;
let checkedWin = false;
let gameWager = 0;
let currentlyInGame = false;

function resetVariables(){
opponentCardHTML = ''; // Default to an empty string
numOpponentCards = 1;
stand = false;
bust = false;
checkedWin = false;
gameWager = 0;
currentlyInGame = false;
}

socket.on('startGame', (data) => {
  const existingGame = document.querySelector('.game');
  if(existingGame){existingGame.remove();}
  resetVariables();
  const isSender = data.user === userName;
  const inviteContainer = document.createElement('div');
  inviteContainer.classList.add('game-invite');
  gameWager = data.wager;
  // If there is a neutral message (waiting for pair), display it
  if (data.message) {
    appendMessage(data.message, "neutral");
  } else {
    // Show the game invite message
    inviteContainer.innerHTML = `
      <p>${isSender ? `Inviting ${otherUserName}` : `${data.user} has invited you`} to play <strong>${data.game}</strong>! Wager = ${data.wager}★!</p>
      <img src="${data.imageUrl}" class="game-image">
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
          socket.emit('gameResponse', { accepted: true, game: data.game, user: userName });
      });

      inviteContainer.querySelector('.reject-btn').addEventListener('click', () => {
          socket.emit('gameResponse', { accepted: false, game: data.game, user: userName });
      });
    }
  }
});

// Remove game invite from both users when game is accepted or rejected
socket.on('removeGameInvite', () => {
  document.querySelectorAll('.game-invite').forEach(invite => invite.remove());
});
let myCards = [];

// Handle game response (accepted/rejected) - notify both users
socket.on('gameResponse', (data) => {
  const message = `${data.user} ${data.accepted ? 'accepted' : 'rejected'} the game.`;
  appendMessage(message, "neutral");

  // Remove the game invite message after decision
  document.querySelectorAll('.game-invite').forEach(invite => invite.remove());
  if (data.accepted){
    currentlyInGame = true;
    const game = document.createElement('div');
    game.classList.add('game');
    game.innerHTML = '';
    chatMessages.appendChild(game);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    myCards = [];
    addCard();
    socket.emit("getCards",{cards:myCards});
  }
});

socket.on('updateGameState', (data) => {
  // Get the game div or create it if it doesn't exist
  const gameDiv = document.querySelector('.game');

  // Update the game div with both players' cards
  
  if (gameDiv) {
   // Assuming 'gameDiv' is where you want to insert the HTML


// Check if opponent's card is available and add the card div if it is
if (data.opponentCards !== null) {
  opponentCardHTML = `<div class="card">${data.opponentCards.join(' ')}</div>`;
  if(numOpponentCards!=100){
  numOpponentCards = data.opponentCards.length;
  }
}

// Now insert the full HTML into 'gameDiv'
gameDiv.innerHTML = `
  <div class="game-container">
    <div class="opponent-cards">
      <h3>Opponent's Cards</h3>
      ${opponentCardHTML}  <!-- Conditionally rendered opponent card -->
    </div>
    <div class="player-cards">
      <h3>Your Cards</h3>
      <div class="card">${myCards.join(' ')}</div> <!-- Display your cards -->
      <div class="action-buttons">
        <button class="hit-button">Hit</button>
        <button class="stand-button">Stand</button>
      </div>
    </div>
  </div>
`;

  }
  document.querySelector('.hit-button').addEventListener('click', () => {
    if (numOpponentCards >= myCards.length){
    // Add a new card
    addCard();
    
    // Emit the updated myCards array to the backend
    socket.emit("getCards", { cards: myCards });
    }

    const total = calculateCardTotal(myCards);
        if (total > 21) {
            stand = true;
            bust = true;
            checkStand();
        }
  });


 

// Event listener for the "Stand" button
document.querySelector('.stand-button').addEventListener('click', () => {
  if (numOpponentCards >= myCards.length){

    stand = true;
    bust = false;
    checkStand();
 
}
});

function checkStand() {
  if (stand) {
    handleStand(bust);
  }
}
checkStand();


});


function handleStand(over21) {
  stand = true;
  document.querySelector('.hit-button').style.display = 'none';
  document.querySelector('.stand-button').style.display = 'none';
  document.querySelector('.action-buttons').style.display = 'none';
  // Calculate the total of the cards
  const total = calculateCardTotal(myCards);

  // Display the total of the cards
  const totalDiv = document.createElement('div');
  totalDiv.classList.add('total');
  totalDiv.innerHTML = `<h3 style="color: ${over21 ? 'red' : 'black'};">Total: ${total}</h3>`;
  document.querySelector('.player-cards').appendChild(totalDiv);

  // Emit the updated game state to the backend
  socket.emit('playerStood', {
    total: total,
    cards: myCards
  });
  if(numOpponentCards==100){
    console.log("Checking win");
    checkWin();
  }
}
function checkWin(){
  allowStarCountPass = true;
  currentlyInGame = false;
  if (!checkedWin){
    console.log("Game Done");
    checkedWin = true;
    let myTotal = calculateCardTotal(myCards);
    if (myTotal > 21 && opponentTotal > 21) {
      appendMessage("Game is a tie!", "neutral");
  } else if (myTotal > 21) {
      appendMessage(`${otherUserName} wins ${gameWager}★!`, "neutral");
      document.dispatchEvent(new CustomEvent("updatePoints", {
        detail: { name: userName, points: -1*gameWager }
      }));
  } else if (opponentTotal > 21) {
      appendMessage(`${userName} wins ${gameWager}★!`, "neutral");
      document.dispatchEvent(new CustomEvent("updatePoints", {
        detail: { name: userName, points: gameWager }
      }));
  } else if (myTotal > opponentTotal) {
      appendMessage(`${userName} wins ${gameWager}★!`, "neutral");
      document.dispatchEvent(new CustomEvent("updatePoints", {
        detail: { name: userName, points: gameWager }
      }));
  } else if (opponentTotal > myTotal) {
      appendMessage(`${otherUserName} wins ${gameWager}★!`, "neutral");
      document.dispatchEvent(new CustomEvent("updatePoints", {
        detail: { name: userName, points: -1*gameWager }
      }));
  } else {
    if (myTotal==opponentTotal){
      appendMessage("Game is a tie!", "neutral");}
      else{
        appendMessage(`${otherUserName} has left the game. You win ${gameWager}★!`, "neutral");
        document.dispatchEvent(new CustomEvent("updatePoints", {
          detail: { name: userName, points: gameWager }
        }));
      }
  }
  document.querySelector('.game').classList.add('old');  
  setTimeout(() => {
    socket.emit('giveStar', getStarCount());
}, 2000);
}}

socket.on('opponentStood', (data) => {
  let opponentTotalDiv = document.querySelector('.opponent-total'); // Check if it already exists
  
  if (!opponentTotalDiv) {
    opponentTotalDiv = document.createElement('div');
    opponentTotalDiv.classList.add('total', 'opponent-total'); // Add a unique class
    document.querySelector('.opponent-cards').appendChild(opponentTotalDiv);
  }
  opponentTotalDiv.innerHTML = `<h3 style="color: ${data.total>21 ? 'red' : 'black'};">Opponent's Total: ${data.total}</h3>`; // Update content
  numOpponentCards = 100;
  opponentTotal = data.total;
  if (stand){
    console.log("Checking win");
    checkWin();
  }
});


setInterval(() => {
  if (numOpponentCards >= myCards.length) {
      if (currentlyInGame){
      setButtonsState(true);}
      else{
        setButtonsState(false);
      }
  } else {
      setButtonsState(false);
  }
}, 100);


function addCard() {
  const suits = ['♠', '♣', '♦', '♥'];  // Card suits
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];  // Card values
  
  // Randomly select a card
  const card = `${values[Math.floor(Math.random() * values.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

  // Append the card to the array
  myCards.push(card);
}

 // Function to calculate the total score of the cards
 function calculateCardTotal(cards) {
  let total = 0;
  let aceCount = 0;

  // Iterate over each card to calculate the total
  cards.forEach(card => {
    const value = card.slice(0, -1); // Get the card value without the suit (e.g., '10' from '10♠')

    if (['J', 'Q', 'K'].includes(value)) {
      total += 10;  // Face cards (Jack, Queen, King) are worth 10
    } else if (value === 'A') {
      aceCount++;  // Count the aces
      total += 11; // Initially count Ace as 11
    } else {
      total += parseInt(value);  // Add numeric card values
    }
  });

  // Adjust for Aces: if the total is over 21 and we have aces, make them worth 1 instead of 11
  while (total > 21 && aceCount > 0) {
    total -= 10;  // Convert one Ace from 11 to 1
    aceCount--;
  }

  return total;
}

function setButtonsState(enabled) {
  const hitButton = document.querySelector(".hit-button");
  const standButton = document.querySelector(".stand-button");

  if (hitButton && standButton) {
      hitButton.disabled = !enabled;
      standButton.disabled = !enabled;

      if (enabled) {
          hitButton.style.opacity = "1";   // Fully visible
          hitButton.style.cursor = "pointer";
          standButton.style.opacity = "1";
          standButton.style.cursor = "pointer";
      } else {
          hitButton.style.opacity = "0.5";  // Greyed out
          hitButton.style.cursor = "not-allowed";
          standButton.style.opacity = "0.5";
          standButton.style.cursor = "not-allowed";
      }
  }
}

const wagerSlider = document.getElementById('wager-slider');
const wagerAmount = document.getElementById('wager-amount');

// Set the min and max values for the slider based on myStars and otherStars


// Update the display to reflect the initial value of the slider
wagerAmount.textContent = `${wagerSlider.value} ★`;

// Listen for changes on the slider
wagerSlider.addEventListener('input', function() {
    wagerAmount.textContent = `${wagerSlider.value} ★`;
    
});

function getWager() {
  return parseInt(wagerSlider.value, 10); // Ensures it returns a number
}
