const socket = io();

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { remove, equalTo, getDatabase, ref, onValue, set, update, orderByChild, query, limitToLast, get } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-database.js";

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyA9QTejm8dOn_YedXx_fWU_VgXFOnuwQVY",
    authDomain: "unfiltered-5894e.firebaseapp.com",
    projectId: "unfiltered-5894e",
    storageBucket: "unfiltered-5894e.firebasestorage.app",
    messagingSenderId: "357128902841",
    appId: "1:357128902841:web:ca4ce2c8a4026c17de2368"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const leaderboardRef = ref(db, "leaderboard");
  const deviceId = getDeviceId();
  const allUsersTab = document.getElementById("all-users-tab");
  const deviceUsersTab = document.getElementById("device-users-tab");
  const leaderboardList = document.getElementById("leaderboard-list");
  let infopage;
  if (leaderboardList){
    infopage = true;
  }
  else{
    infopage = false;
  }

  function getDeviceId() {
    // Check if a device ID already exists
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        // Generate a new random device ID and store it
        deviceId = `device-${crypto.randomUUID()}`;
        localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
}

// Function to update the leaderboard UI
function updateLeaderboard(snapshot, filterDevice = false) {
  leaderboardList.innerHTML = ""; // Clear current list
  if(!filterDevice){
    const firstPrize = document.createElement("li");
    firstPrize.classList.add("first-prize", "highlight");
    firstPrize.innerHTML = `First Place Gains Free $40.00 USD!<br>(3/3/25 12:00PM EST)`;
    leaderboardList.appendChild(firstPrize);
  }
  // Step 1: Collect and sort users by points (highest first)
  const users = [];
  snapshot.forEach(childSnapshot => {
    const data = childSnapshot.val();
    users.push({ name: data.name, points: data.points, deviceId: data.deviceId });
  });

  users.sort((a, b) => b.points - a.points); // Sort by points descending

  // Step 2: Assign ranks based on sorted position
  let rank = 1;
  const rankedUsers = users.map((user, index) => {
    if (index > 0 && users[index].points < users[index - 1].points) {
      rank = index + 1; // Adjust rank only when points decrease
    }
    return { ...user, rank };
  });

  // Step 3: If filtering, only include users from this device
  const deviceId = getDeviceId();
  const filteredUsers = filterDevice
    ? rankedUsers.filter(user => user.deviceId === deviceId)
    : rankedUsers;

  // Step 4: Determine display limits
  let displayedCount = 0;
  let extraUsers = 0;
  const maxUsersToShow = 8; // Limit for all-users leaderboard

  for (let i = 0; i < filteredUsers.length; i++) {
    const user = filteredUsers[i];
    if (!filterDevice && displayedCount >= maxUsersToShow) {

      extraUsers++; // Count extra users beyond the limit
      continue;
    }

    const li = document.createElement("li");

    let rankDisplay = `${user.rank}.`;
    if (user.rank === 1) {
      rankDisplay = "🥇"; // Gold medal
    } else if (user.rank === 2) {
      rankDisplay = "🥈"; // Silver medal
    } else if (user.rank === 3) {
      rankDisplay = "🥉"; // Bronze medal
    }

    li.innerHTML = `${rankDisplay} ${user.name} <span>${user.points}</span>`;
    if (!filterDevice && user.deviceId === getDeviceId()) {

      li.classList.add("highlight");
    }
    // If filtering for the device, add an "x" button to remove users
    if (filterDevice) {
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "❌";
      removeBtn.classList.add("remove-btn");
      removeBtn.onclick = () => removeUser(user.name);

      li.appendChild(removeBtn);
    }

    leaderboardList.appendChild(li);
    displayedCount++;
  }

  // Step 5: Show "And X more users" if there are extra users
  if (!filterDevice && extraUsers > 0) {
    const moreUsersLi = document.createElement("li");
    moreUsersLi.classList.add("more-users");
    moreUsersLi.textContent = `And ${extraUsers} more users...`;
    leaderboardList.appendChild(moreUsersLi);
  }
}





  // Listen for changes and update leaderboard
  if (infopage){
  onValue(query(leaderboardRef, orderByChild("points"), limitToLast(10)), updateLeaderboard);}

  // Function to add/update user score
  function addUser(username, points) {
    const deviceId = getDeviceId();
    const userKey = `${deviceId}_${username}`; // Unique key combining deviceId and username
    const userRef = ref(db, `leaderboard/${userKey}`);

    // Check if the specific deviceId + username combo already exists
    get(userRef).then(snapshot => {
        if (!snapshot.exists()) {
            // If the combination is unique, add the user
            set(userRef, { name: username, points, deviceId })
                .then(() => console.log(`${username} added with ${points} points.`))
                .catch(error => console.error("Error adding user:", error));
        } else {
            console.log(`User ${username} already exists on this device.`);
        }
    }).catch(error => console.error("Error checking user:", error));
}


function resetBonus() {
  startBonus = 3;
  localStorage.setItem('startBonus', 3);
  localStorage.setItem('lastResetTime', Date.now()); // Store the current time as last reset time
}
let startBonus = parseInt(localStorage.getItem('startBonus'), 10);
let lastResetTime = parseInt(localStorage.getItem('lastResetTime'), 10);
if (isNaN(startBonus) || isNaN(lastResetTime)) {
  startBonus = 3;
  lastResetTime = Date.now();
  localStorage.setItem('startBonus', startBonus);
  localStorage.setItem('lastResetTime', lastResetTime);
}
if (lastResetTime && Date.now() - lastResetTime >= 86400000) {
  resetBonus(); // Reset the bonus if 24 hours have passed
}
function setBonus(newBonus) {
  startBonus = newBonus;
  localStorage.setItem('startBonus', startBonus);  // Save the new value to localStorage
}


  // Function to update an existing user's score
  function setUserScore(username, newPoints) {
    const userRef = ref(db, `leaderboard/${username}`);

    // Check if user exists before updating
    get(userRef).then(snapshot => {
      if (snapshot.exists()) {
        update(userRef, { points: newPoints })
          .then(() => console.log(`${username}'s score updated to ${newPoints}.`))
          .catch(error => console.error("Error updating score:", error));
      } else {
        console.log(`${username} does not exist.`);
      }
    });
  }
 function incrementUserScore(username, amount,...args) {
    let deviceId = getDeviceId();
    const leaderboardRef = ref(db, "leaderboard");
    if (args.length === 1) {
      deviceId = args[0];
    }
    get(leaderboardRef).then(snapshot => {
      if (snapshot.exists()) {
        let userKey = null;
        let currentPoints = 0;
  
        snapshot.forEach(childSnapshot => {
          const userData = childSnapshot.val();
  
          // Find the correct user entry by matching both name and deviceId
          if (userData.name === username && userData.deviceId === deviceId) {
            userKey = childSnapshot.key;
            currentPoints = userData.points;
          }
        });
  
        if (userKey) {
          const userRef = ref(db, `leaderboard/${userKey}`);
          const newPoints = currentPoints + amount;
  
          update(userRef, { points: newPoints })
            .then(() => console.log(`${username} (Device: ${deviceId})'s score increased by ${amount} to ${newPoints}.`))
            .catch(error => console.error("Error incrementing score:", error));
        } else {
          console.log(`${username} (Device: ${deviceId}) does not exist.`);
        }
      } else {
        console.log("Leaderboard is empty.");
      }
    }).catch(error => console.error("Error fetching leaderboard data:", error));
  }
  

  function getUserPointsByDeviceId(name, deviceId) {
    // Reference to the leaderboard
    const leaderboardRef = ref(db, "leaderboard");
  
    return new Promise((resolve, reject) => {
      get(leaderboardRef).then(snapshot => {
        if (snapshot.exists()) {
          let userPoints = 0; // Default to 0
  
          snapshot.forEach(childSnapshot => {
            const userData = childSnapshot.val();
  
            // Check if both name and deviceId match
            if (userData.name === name && userData.deviceId === deviceId) {
              userPoints = userData.points;
            }
          });
  
          // Resolve with the points (either found or 0)
          resolve(userPoints);
        } else {
          resolve(0); // If the snapshot is empty, return 0
        }
      }).catch(error => {
        reject("Error fetching user data: " + error);
      });
    });
  }
  
  
  function loadLeaderboard(filterDevice = false) {
    get(leaderboardRef).then(snapshot => {
      updateLeaderboard(snapshot, filterDevice);
    }).catch(error => console.error("Error fetching leaderboard:", error));
  }


const nameInput = document.getElementById("name");
const starCountDiv = document.getElementById("star-count");
const badgeDiv = document.getElementById('badge');
// Example deviceId (this could come from the user's session or be dynamically assigned)
 // Replace this with the actual deviceId logic

// Event listener for real-time input
function updateStarCount() {
  let name;
  if (infopage) {
    name = nameInput.value.trim();
  } else {
    name = userName;
  }

  // Only search if the name has characters
  if (name) {
    getUserPointsByDeviceId(name, deviceId)
      .then(points => {
        sessionStorage.setItem('videoStars', points);
        animateStarCount(points); // Use animation instead of direct update
      })
      .catch(error => {
        animateStarCount(0); // Default to 0 with animation
        console.error(error);
      });
  } else {
    animateStarCount(0); // Default to 0 when input is empty
  }
}

function animateStarCount(targetPoints, duration = 200) {
  let currentPoints = parseInt(starCountDiv.innerText) || 0;
  let startTime = null;

  function updateCount(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1); // Ensure progress doesn't exceed 1

    // Interpolating between currentPoints and targetPoints
    const animatedValue = Math.round(currentPoints + (targetPoints - currentPoints) * progress);
    starCountDiv.innerHTML = `${animatedValue} &#9733;`;
    if(infopage){
      let badgeSrc = "icons/bronzeBadge.png"; // Default to the first badge

      if (targetPoints >= 20 && targetPoints < 40) {
        badgeSrc = "icons/bronzeBadge2.png";
      } else if (targetPoints >= 40 && targetPoints < 60) {
        badgeSrc = "icons/bronzeBadge3.png";
      } else if (targetPoints >= 60 && targetPoints < 80) {
        badgeSrc = "icons/bronzeBadge4.png";
      } else if (targetPoints >= 80 && targetPoints < 100) {
        badgeSrc = "icons/bronzeBadge5.png";
      } else if (targetPoints >= 100) {
        badgeSrc = "icons/bronzeBadge6.png";
      }
      if (targetPoints >= 120 && targetPoints < 160) {
        badgeSrc = "icons/silverBadge.png";
      } else if (targetPoints >= 160 && targetPoints < 200) {
        badgeSrc = "icons/silverBadge2.png";
      } else if (targetPoints >= 200 && targetPoints < 240) {
        badgeSrc = "icons/silverBadge3.png";
      } else if (targetPoints >= 240 && targetPoints < 280) {
        badgeSrc = "icons/silverBadge4.png";
      } else if (targetPoints >= 280 && targetPoints < 320) {
        badgeSrc = "icons/silverBadge5.png";
      } else if (targetPoints >= 320) {
        badgeSrc = "icons/silverBadge6.png";
      }
      if (targetPoints >= 360 && targetPoints < 440) {
        badgeSrc = "icons/goldBadge.png";
      } else if (targetPoints >= 440 && targetPoints < 520) {
        badgeSrc = "icons/goldBadge2.png";
      } else if (targetPoints >= 520 && targetPoints < 600) {
        badgeSrc = "icons/goldBadge3.png";
      } else if (targetPoints >= 600 && targetPoints < 680) {
        badgeSrc = "icons/goldBadge4.png";
      } else if (targetPoints >= 680 && targetPoints < 760) {
        badgeSrc = "icons/goldBadge5.png";
      } else if (targetPoints >= 760) {
        badgeSrc = "icons/goldBadge6.png";
      }
      
      badgeDiv.src = badgeSrc; // Set the new image
    }
    if (progress < 1) {
      requestAnimationFrame(updateCount);
    }
  }

  requestAnimationFrame(updateCount);
}

// Run on input event
if (infopage){
nameInput.addEventListener("input", updateStarCount);
}

// Run once when the page loads
if (infopage){
document.addEventListener("DOMContentLoaded", updateStarCount);}
if (infopage){
allUsersTab.addEventListener("click", () => {
  allUsersTab.classList.add("active");
  deviceUsersTab.classList.remove("active");
  loadLeaderboard(false);
});}
if (infopage){
deviceUsersTab.addEventListener("click", () => {
  deviceUsersTab.classList.add("active");
  allUsersTab.classList.remove("active");
  loadLeaderboard(true);
});}

// Initial Load (All Users by Default)
if (infopage){
loadLeaderboard(false);}

document.addEventListener("DOMContentLoaded", () => {
  const startChatBtn = document.querySelector(".start-chat-btn");

  if (startChatBtn) {
      startChatBtn.addEventListener("click", () => {
        const nameInput = document.getElementById('name').value;

        // Check if the name input is empty
        if (nameInput.trim() !== "") {
          console.log("New user added!");
          if(startBonus>0){
            addUser(nameInput,10);
          setBonus(startBonus-1);}
          else{
            addUser(nameInput,0);
          }
        }
      });
  }
});

updateStarCount();

document.addEventListener("updatePoints", (event) => {
  console.log("Updated points!");
  const { name, points } = event.detail; // Extract values
  incrementUserScore(name,points);
  setTimeout(() => {
    updateStarCount();
}, 500);

});

function removeUser(name) {
  const deviceId = getDeviceId();
  const leaderboardRef = ref(db, "leaderboard");

  // Query to find the user with the matching name and deviceId
  const userQuery = query(leaderboardRef, orderByChild("name"), equalTo(name));

  get(userQuery).then(snapshot => {
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        const userData = childSnapshot.val();
        if (userData.deviceId === deviceId) {
          // Remove the user from the database
          remove(childSnapshot.ref)
            .then(() => {
              console.log(`${name} (device ${deviceId}) removed successfully.`);
              // Re-fetch leaderboard data and update only the "Your Device" tab
              get(leaderboardRef).then(updatedSnapshot => {
                updateLeaderboard(updatedSnapshot, true); // Ensure filtering remains active
              });
            })
            .catch(error => console.error("Error removing user:", error));
        }
      });
    } else {
      console.log(`User ${name} not found.`);
    }
  }).catch(error => console.error("Error fetching user data:", error));
}





document.addEventListener("DOMContentLoaded", function() {
  const Rewardbutton = document.getElementById('claim-reward-btn');

  // Function to check if the button should be enabled
  function checkRewardStatus() {
    const lastClaimDate = localStorage.getItem('lastClaimDate');
    const currentDate = new Date().toISOString().split('T')[0]; // Get the date in YYYY-MM-DD format

    if (lastClaimDate === currentDate) {
      Rewardbutton.disabled = true; // Disable the button if the reward was already claimed today
      Rewardbutton.innerText = 'Reward Claimed'; // Change the text to show reward has been claimed
    } else {
      Rewardbutton.disabled = false; // Enable the button if it's a new day
      Rewardbutton.innerText = 'Claim Reward'; // Reset the text to the original one
    }
  }

  // Check the reward status when the page loads
  if(infopage){
  checkRewardStatus();}

  // Handle button click
  if (infopage){
  Rewardbutton.addEventListener('click', function() {
    
      if(nameInput.value.trim()){
    // Save today's date in localStorage to prevent claiming again today
    const currentDate = new Date().toISOString().split('T')[0];
    localStorage.setItem('lastClaimDate', currentDate);

    // Disable the button and change the text
        if(startBonus>0){
            addUser(nameInput.value.trim(),10);
          setBonus(startBonus-1);}
          else{
            addUser(nameInput.value.trim(),0);
          }
  
  setTimeout(() => {
    incrementUserScore(nameInput.value.trim(),10);
}, 200);
  setTimeout(() => {
    updateStarCount();
}, 500);

  this.innerText = 'Reward Claimed';
  this.disabled = true;
}
  });}
});

// This is your Stripe public key
const stripe = Stripe('pk_live_51QsZVcRxTYiZzB69SpU7q13vCSMYj1sJwvY7wQDYk2Rm0C8nZyeu03y7KceScHeumpgLzvHY47ilzTXxdRHE7ocR00OYLgZvea');

document.getElementById('product-100-stars').addEventListener('click', async (event) => {
    const nameInput = document.getElementById('name').value;
    if (nameInput.trim() === "") {
        alert("Please enter your name for stars!");
    }
    else{
      sessionStorage.setItem('name', nameInput);
  await handleCheckout(event, '100 Stars'); // Only send the product name
    }
});

document.getElementById('product-150-stars').addEventListener('click', async (event) => {
    const nameInput = document.getElementById('name').value;
    if (nameInput.trim() === "") {
        alert("Please enter your name for stars!");
    }
    else{
      sessionStorage.setItem('name', nameInput);
  await handleCheckout(event, '150 Stars'); // Only send the product name
    }
});

document.getElementById('product-250-stars').addEventListener('click', async (event) => {
    const nameInput = document.getElementById('name').value;
    if (nameInput.trim() === "") {
        alert("Please enter your name for stars!");
    }
    else{
      sessionStorage.setItem('name', nameInput);
  await handleCheckout(event, '250 Stars'); // Only send the product name
    }
});

document.getElementById('product-700-stars').addEventListener('click', async (event) => {
    const nameInput = document.getElementById('name').value;
    if (nameInput.trim() === "") {
        alert("Please enter your name for stars!");
    }
    else{
      sessionStorage.setItem('name', nameInput);
  await handleCheckout(event, '700 Stars'); // Only send the product name
    }
});

async function handleCheckout(event, productName) {
  try {
    const response = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName })  // Send only the product name
    });

    if (response.ok) {
      const session = await response.json();
      const { error } = await stripe.redirectToCheckout({ sessionId: session.id });

      if (error) {
        console.error(error.message);
      }
    } else {
      console.error('Failed to create checkout session');
    }
  } catch (error) {
    console.error('Error during checkout process:', error);
  }
}

socket.on("connect", () => {
  console.log("🔗 Connected to WebSocket server");
});
    
socket.on("payment-success", (data) => {
  console.log(`✅ Payment successful for ${data.productName}`);
  let payment = 0;
  if (data.productName==499){
    payment = 100;
  }
  if (data.productName==899){
    payment = 150;
  }
  if (data.productName==999){
    payment = 250;
  }
  if (data.productName==2499){
    payment = 700;
  }
  if(startBonus>0){
            addUser(nameInput.value.trim(),10);
          setBonus(startBonus-1);}
          else{
            addUser(nameInput.value.trim(),0);
          }
  setTimeout(() => {
    incrementUserScore(nameInput.value.trim(),payment);
}, 200);
  setTimeout(() => {
    updateStarCount();
}, 500);
});
    
socket.on("disconnect", () => {
  console.log("❌ Disconnected from WebSocket server");
});



const codes = [
    "MARIO-1985",          // Classic Mario game reference
    "HARRY-P0TTER7",       // Harry Potter book series
    "SPIDERMAN-2099",      // Spider-Man (future version)
    "THE-WINNING-1",       // Inspirational theme
    "JEDI-MASTER22",       // Star Wars reference
    "C0D3X-RED",           // Coding + color reference
    "R2D2-42",             // Star Wars droid
    "IRONMAN-2025",        // Iron Man Marvel reference
    "THOR-THUNDER",        // Thor from Marvel
    "CAPTAIN-AMERICA-5",   // Marvel Captain America
    "SONIC-BOOM",          // Sonic the Hedgehog
    "G0LDEN-FURY",         // Golden Fist (martial arts vibe)
    "BATMAN-DARK",         // Batman reference
    "YODA-LIGHT",          // Yoda from Star Wars
    "ALIEN-XENOMORPH",     // Alien franchise
    "WINNER-101",          // Winning theme
    "DELOREAN-88MPH",      // Back to the Future reference
    "RICK-AND-MORTY-RV",   // Rick and Morty reference
    "MATRIX-TRINITY",      // The Matrix movie reference
];


// Check if code has been redeemed
function checkCode() {
    const codeInput = document.getElementById('code-input').value.trim();
    
    // Check if code exists in the list
    if (codes.includes(codeInput)) {
        const redeemedCodes = JSON.parse(localStorage.getItem('redeemedCodes')) || [];

        // Check if the code has been redeemed before
        if (redeemedCodes.includes(codeInput)) {
            alert('Code already redeemed!');
        } else if(document.getElementById("star-count").innerText=='0 ★'){
          alert('Must have stars to redeem!');
        }
          else{
            // Mark the code as redeemed and update localStorage
            redeemedCodes.push(codeInput);
            localStorage.setItem('redeemedCodes', JSON.stringify(redeemedCodes));
              setTimeout(() => {
                incrementUserScore(nameInput.value.trim(),10);
            }, 200);
            alert('Code redeemed!');
            setTimeout(() => {
              updateStarCount();
          }, 500);
        }
    } else if(codeInput.includes('?')){
        let starCountText = document.getElementById("star-count").innerText;

        // Extract the numeric part of the string (removes the ' ★' part)
        let starCount = parseInt(starCountText, 10);

        // Check if the star count is greater than or equal to 20
        if (starCount < 20) {
          alert("You need more stars to use referral codes.");
            return;
        }
      let usedReferralCodes = JSON.parse(localStorage.getItem("usedReferralCodes")) || [];
      if (usedReferralCodes.includes(codeInput)) {
        alert('Code already redeemed!');
      return;}
      let [name, id] = codeInput.split("?");
      id = "device-" + id;
      if(id==deviceId){
        alert('Cannot use your own code!');
        return;
      }
      
        setTimeout(() => {
          incrementUserScore(name,10,id);
      }, 200);
      alert('Checking Referral Code!');
      setTimeout(() => {
        updateStarCount();
    }, 500);
      
    }
    else{alert('Invalid code!');}

    // Clear input field after submission
    document.getElementById('code-input').value = '';
}

// Attach event listener to the button
if(infopage){
document.getElementById('code-button').addEventListener('click', checkCode);
document.getElementById('referral-code-display').innerText = `Your referral code: ${nameInput.value.trim()}?${deviceId.replace(/^device-/, '')}`;}

function updateReferralCode() {
  if (document.getElementById("star-count").innerText === '0 ★') {
    document.querySelector('.copy-btn').style.display = 'none';
      document.getElementById('referral-code-display').innerText = ``;
  } else {
    document.querySelector('.copy-btn').style.display = 'inline-block';
      document.getElementById('referral-code-display').innerText = 
          `Your referral code: ${nameInput.value.trim()}?${deviceId.replace(/^device-/, '')}`;
  }
}

// Run updateReferralCode every second (1000 ms)
if(infopage){
setInterval(updateReferralCode, 200);}

