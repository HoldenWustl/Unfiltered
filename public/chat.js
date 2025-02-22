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
  socket.emit('giveStar', getStarCount());
  allowStarCountPass = false;
  otherStarCount = star;
  otherStarBlock.innerHTML = `${otherStarCount} &#9733;`;
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
}, 10);
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
    opponentTotal = -1;
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
function toggeleThemeMenu() {
  const themeMenu = document.getElementById('theme-menu');
  themeMenu.style.display = themeMenu.style.display === 'flex' ? 'none' : 'flex';
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
  if (gameName === 'pickPass') {
    gameInvite = {
      game: "Pick n' Pass",
      user: userName,
      imageUrl: 'icons/pickpass-icon.png', // Replace with actual image URL
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
let currentGame = '';
let playedClashCard;
let clashCard = 0;
let myPoints = 0;

function resetVariables(){
opponentCardHTML = ''; // Default to an empty string
numOpponentCards = 1;
stand = false;
bust = false;
checkedWin = false;
gameWager = 0;
currentlyInGame = false;
currentGame = '';
clashCard = 0;
myPoints = 0;
playedClashCard = false;
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
      <p>${isSender ? `Inviting ${otherUserName}` : `${data.user} has invited you`} to play <strong>${data.game}</strong>! Wager: ${data.wager}★!</p>
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
    currentGame = data.game;
    chatMessages.appendChild(game);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if(data.game=='21'){
    myCards = [];
    addCard();
    socket.emit("getCards",{cards:myCards});
    }
    if(data.game=='Card Clash'){
      myCards = [1,2,3,4,5];
      socket.emit("getCards",{cards:myCards});
    }
    if(data.game=="Pick n' Pass"){
      myCards = [];
      while(myCards.length<6){
        addCard();
      }
      socket.emit("getCards",{cards:myCards});
    }
  }
});

socket.on('updateGameState', (data) => {
  wagerSlider.value = gameWager;
  wagerAmount.textContent = `${gameWager} ★`;
  if(currentGame=='21'){
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
  }
  if(currentGame=='Card Clash'){
    if(data.opponentCards){
    const gameDiv = document.querySelector('.game');
    gameDiv.innerHTML = ''; // Clear previous content

    // Create player cards section
    const playerCardsDiv = document.createElement('div');
    playerCardsDiv.classList.add('player-cards');
    playerCardsDiv.innerHTML = '<h3>Your Cards</h3>';
    opponentTotal = data.opponentPoints;
    myCards.forEach((card, index) => {
        const cardEl = document.createElement('button');
        cardEl.classList.add('card');
        cardEl.textContent = card;
        cardEl.onclick = () => playCard(card, index);
        playerCardsDiv.appendChild(cardEl);
    });
    const playerPointsEl = document.createElement('p');
    playerPointsEl.classList.add('points');
    
    playerCardsDiv.appendChild(playerPointsEl);

    gameDiv.appendChild(playerCardsDiv);

    // Create opponent cards section (hide values)
    const opponentCardsDiv = document.createElement('div');
    opponentCardsDiv.classList.add('opponent-cards');
    opponentCardsDiv.innerHTML = '<h3>Opponent’s Cards</h3>';

    if (data.opponentCards) {
        data.opponentCards.forEach((card) => {
            const cardEl = document.createElement('div');
            cardEl.classList.add('card', 'opponent-card');
            cardEl.textContent = card; 
            opponentCardsDiv.appendChild(cardEl);
        });
    }

    const opponentPointsEl = document.createElement('p');
    opponentPointsEl.classList.add('points');
    opponentPointsEl.textContent = `Points: ${data.opponentPoints || 0}`;
    opponentCardsDiv.appendChild(opponentPointsEl);

    gameDiv.appendChild(opponentCardsDiv);
    setTimeout(() => {
      playedClashCard = false;
      playerPointsEl.textContent = `Points: ${myPoints || 0}`;
      if(myCards.length==0){
        checkWin();
      }
  }, 20);

  
   
  }}
  if(currentGame=="Pick n' Pass"){
    if(!data.opponentCards){
    const gameDiv = document.querySelector('.game');
gameDiv.innerHTML = ''; // Clear previous content

// Create player section
const playerCardsDiv = document.createElement('div');
playerCardsDiv.classList.add('player-cards');
playerCardsDiv.innerHTML = '<h3>Your Card</h3>';

// Display only the first card
const myCardEl = document.createElement('div');
myCardEl.classList.add('card');
myCardEl.textContent = myCards[0];

playerCardsDiv.appendChild(myCardEl);

const remainingCardsEl = document.createElement('p');
remainingCardsEl.classList.add('remaining-cards');
remainingCardsEl.textContent = `Remaining cards: ${myCards.length}`;
playerCardsDiv.appendChild(remainingCardsEl);

// Create buttons
const buttonsDiv = document.createElement('div');
buttonsDiv.classList.add('pp-buttons');

const pickButton = document.createElement('button');
pickButton.classList.add('pick-btn');
pickButton.textContent = 'Pick';
pickButton.onclick = () => pickCard(); // Define pickCard() function separately

const passButton = document.createElement('button');
passButton.classList.add('pass-btn');
passButton.textContent = 'Pass';
passButton.onclick = () => passCard(); // Define passCard() function separately

buttonsDiv.appendChild(pickButton);
buttonsDiv.appendChild(passButton);
playerCardsDiv.appendChild(buttonsDiv);

gameDiv.appendChild(playerCardsDiv);

// Create opponent section
const opponentCardsDiv = document.createElement('div');
opponentCardsDiv.classList.add('opponent-cards');
opponentCardsDiv.innerHTML = '<h3>Opponent’s Card</h3>';

// Display a hidden card
const opponentCardEl = document.createElement('div');
opponentCardEl.classList.add('card', 'opponent-card');
opponentCardEl.textContent = '?';

opponentCardsDiv.appendChild(opponentCardEl);
gameDiv.appendChild(opponentCardsDiv);

function pickCard() {
  myCardEl.classList.add('selected'); // Mark card as selected
  myPoints = getCardValue(myCards[0]);
  disableButtons();
  playedClashCard = true;
  socket.emit("playPickCard",myCards[0]);
}

// Function to handle passing (this should later cycle to the next card)
function passCard() {

  myCards.shift(); 
  socket.emit("getCards", { cards: myCards });
  // Add logic here to show the next card from myCards[]
}

if(myCards.length==1){
  passButton.disabled = true;
  passButton.style.opacity = "0.5"; 
  passButton.style.cursor = "not-allowed";
}
else{
  passButton.disabled = false;
}
// Disable buttons after selection
function disableButtons() {
  pickButton.disabled = true;
  passButton.disabled = true;
  pickButton.style.opacity = "0.5"; 
    pickButton.style.cursor = "not-allowed";
    passButton.style.opacity = "0.5"; 
    passButton.style.cursor = "not-allowed";
}

  }}
});

function playCard(card, index) {
  clashCard = card;
  playedClashCard = true;
  socket.emit('playCard', card);
  myCards.splice(index, 1);

  // Disable all cards & add "selected" effect to the chosen one
  document.querySelectorAll('.player-cards .card').forEach((el, i) => {
      el.disabled = true;
      if (i === index) {
          el.classList.add('selected'); // Add a class instead of removing the element
      }
  });
}

socket.on('gotPickPlay', (data) => {
  let wait = playedClashCard;
  const waitForPlay = setInterval(() => {
    if (playedClashCard){
      clearInterval(waitForPlay); // Stop checking once the card is played     
      const opponentCardElement = document.querySelector('.opponent-card');
      if (opponentCardElement) {
        opponentCardElement.innerHTML = data.opponentCard;
        opponentCardElement.classList.add('selected');
      }

      opponentTotal = getCardValue(data.opponentCard);
      checkWin();
    }
  }, 100); // Check every 100ms
});


socket.on('gotClashPlay', (data) => {
    let wait = playedClashCard;
  const waitForPlay = setInterval(() => {
      if (playedClashCard) {
          clearInterval(waitForPlay); // Stop checking once the card is played

          if (clashCard > data.opponentCard) {
              myPoints ++;}
              
                if(!wait){setTimeout(() => { socket.emit("getCards", { cards: myCards, points: myPoints });
                
              }, 100); }
                else{socket.emit("getCards", { cards: myCards, points: myPoints });}
          
      }
  }, 100); // Check every 100ms
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
    let myTotal;
    if(currentGame=="21"){
      myTotal = calculateCardTotal(myCards);
    }
    if(currentGame=="Card Clash"){
      myTotal = myPoints;
    }
    if(currentGame=="Pick n' Pass"){
      myTotal = myPoints;
    }

    if (opponentTotal == -1){
      appendMessage(`${otherUserName} has left the game. You win ${gameWager}★!`, "neutral");
      document.dispatchEvent(new CustomEvent("updatePoints", {
        detail: { name: userName, points: gameWager }
      }));
    }
    else if (myTotal > 21 && opponentTotal > 21) {
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
  } else if (myTotal==opponentTotal){
    appendMessage("Game is a tie!", "neutral");
  } else{
    console.log("Error checking win");
  }
  document.querySelector('.game').classList.add('old');  
  setTimeout(() => {
    socket.emit('giveStar', getStarCount());
    wagerSlider.value = Math.min(wagerSlider.max,gameWager);
    wagerAmount.textContent = `${wagerSlider.value} ★`;
    gameWager = 0;
}, 1000);
  
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
  updateWagerSlider();
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
function getCardValue(card) {
  // Extract the face value (e.g., 8, J, Q, K, A)
  const cardValue = card.slice(0, -1); // Remove the suit (last character)
  
  // Map face cards to their values
  if (cardValue === 'J') return 11;
  if (cardValue === 'Q') return 12;
  if (cardValue === 'K') return 13;
  if (cardValue === 'A') return 1;
  
  // For number cards, just return the number
  return parseInt(cardValue);
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

// Function to update wagerSlider based on currentlyInGame status
function updateWagerSlider() {
  const wagerSlider = document.querySelector('.wager-slider'); // Assume this is the class for the slider
  
  if (currentlyInGame) {
      // Disable the slider if currentlyInGame is true
      wagerSlider.disabled = true;
      wagerSlider.style.opacity = "0.5"; // Optional: Change opacity to visually indicate it's disabled
      wagerSlider.style.cursor = "not-allowed"; // Optional: Change cursor to indicate it's not clickable
  } else {
      // Enable the slider if currentlyInGame is false
      wagerSlider.disabled = false;
      wagerSlider.style.opacity = "1"; // Reset opacity to normal
      wagerSlider.style.cursor = "pointer"; // Reset cursor to indicate it's clickable
  }
}



document.addEventListener("DOMContentLoaded", () => { 
  const themeItems = document.querySelectorAll(".theme-item");
  
  // Load saved theme from localStorage
  const savedTheme = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark-mode", savedTheme === "dark");
  document.body.classList.toggle("jungle-mode", savedTheme === "jungle");
  document.body.classList.toggle("cyberpunk-mode", savedTheme === "cyberpunk");
  document.body.classList.toggle("snow-mode", savedTheme === "snow");

  // Set selected state on the correct theme item
  themeItems.forEach(item => {
      item.classList.toggle("selected", item.dataset.theme === savedTheme);

      // Check if the theme has been updated before by checking localStorage
      const themeName = item.dataset.theme;
      const themeUpdated = localStorage.getItem(`${themeName}-updated`) === "true";

      if (themeUpdated) {
          // If theme is updated, remove the star count from button text
          const themeText = item.querySelector("span");
          const originalText = themeText.textContent;
          themeText.textContent = originalText.split(" | ")[0]; // Remove star count
          item.classList.add("updated");
      }
  });

  themeItems.forEach(item => {
      item.addEventListener("click", () => {
          const selectedTheme = item.dataset.theme;
          const costText = item.querySelector("span").textContent;
          const cost = parseInt(costText.split(" | ")[1], 10); // Extract cost (star count)
          const starCount = getStarCount(); // Get the current star count

          // Check if user has enough stars and if the theme hasn't been updated
          if (starCount >= cost && !item.classList.contains("updated")) {
              // Remove "selected" from all items, then set it on the clicked one
              themeItems.forEach(i => i.classList.remove("selected"));
              item.classList.add("selected");

              // Apply theme class to body
              document.body.classList.toggle("dark-mode", selectedTheme === "dark");
              document.body.classList.toggle("jungle-mode", selectedTheme === "jungle");
              document.body.classList.toggle("cyberpunk-mode", selectedTheme === "cyberpunk");
              document.body.classList.toggle("snow-mode", selectedTheme === "snow");

              // Save the theme selection
              localStorage.setItem("theme", selectedTheme);

              // Update theme name by removing star count from the button
              const themeText = item.querySelector("span");
              const originalText = themeText.textContent;
              themeText.textContent = originalText.split(" | ")[0]; // Remove star count

              // First-time purchase logic
              item.classList.add("updated");
              localStorage.setItem(`${selectedTheme}-updated`, "true");

              // Dispatch the updatePoints event to deduct stars
              document.dispatchEvent(new CustomEvent("updatePoints", {
                  detail: { name: userName, points: -cost }
              }));

              // Call updateStars() on first-time purchase
              updateStars(); // Call your function to update stars
          } else if (item.classList.contains("updated")) {
              // If already updated, just switch to the theme without alert
              themeItems.forEach(i => i.classList.remove("selected"));
              item.classList.add("selected");

              // Apply theme class to body
              document.body.classList.toggle("dark-mode", selectedTheme === "dark");
              document.body.classList.toggle("jungle-mode", selectedTheme === "jungle");
              document.body.classList.toggle("cyberpunk-mode", selectedTheme === "cyberpunk");
              document.body.classList.toggle("snow-mode", selectedTheme === "snow");

              // Save the theme selection without deducting stars again
              localStorage.setItem("theme", selectedTheme);
          } else {
              alert("You don't have enough stars to select this theme!");
          }
      });
  });
});

function createSnowflakes() { 
  const numFlakes = 50; 
  const colors = ['#ffffff', '#d4f1f9', '#e8f8ff']; 

  for (let i = 0; i < numFlakes; i++) {
    const flake = document.createElement('div');
    flake.classList.add('snowflake');
    flake.innerHTML = '❄'; 
    document.body.appendChild(flake);

    const size = Math.random() * 10 + 10 + 'px';
    flake.style.left = Math.random() * 90 + 5 + 'vw';
    flake.style.fontSize = size;
    flake.style.color = colors[Math.floor(Math.random() * colors.length)];
    flake.style.animationDuration = Math.random() * 3 + 2 + 's';
    flake.style.animationDelay = Math.random() * 5 + 's';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Create snowflakes initially if snow-mode class is present
  if (document.body.classList.contains('snow-mode')) {
    createSnowflakes(); 
  }

  // Set up MutationObserver to detect changes to the body class
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        if (document.body.classList.contains('snow-mode')) {
          createSnowflakes(); 
        } else {
          // Optionally, remove existing snowflakes if the class is removed
          document.querySelectorAll('.snowflake').forEach(flake => flake.remove());
        }
      }
    });
  });

  observer.observe(document.body, {
    attributes: true // Listen for changes to attributes (like class)
  });
});



