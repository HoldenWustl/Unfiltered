

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { equalTo, getDatabase, ref, onValue, set, update, orderByChild, query, limitToLast, get } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-database.js";

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

  // Step 3: If filtering, only include matching deviceId users
  const filteredUsers = filterDevice
    ? rankedUsers.filter(user => user.deviceId === getDeviceId()) // Use getDeviceId() dynamically
    : rankedUsers;

  // Step 4: Determine display limits
  let displayedCount = 0;
  let lastRank = 0;
  let extraUsers = 0;
  const maxUsersToShow = 5; // Limit for all-users leaderboard

  for (const user of filteredUsers) {
    if (!filterDevice && displayedCount >= maxUsersToShow && user.rank > lastRank) {
      extraUsers++; // Count extra users not shown
      continue; // Stop displaying new ranks after limit
    }

    const li = document.createElement("li");
    li.innerHTML = `${user.rank}. ${user.name} <span>${user.points}</span>`;

    // Highlight users that match our deviceId (only in all-users leaderboard)
    if (!filterDevice && user.deviceId === getDeviceId()) {
      li.classList.add("highlight");
    }

    leaderboardList.appendChild(li);
    displayedCount++;
    lastRank = user.rank;
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
  function incrementUserScore(username, amount) {
    const deviceId = getDeviceId();
    const leaderboardRef = ref(db, "leaderboard");
  
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

// Example deviceId (this could come from the user's session or be dynamically assigned)
 // Replace this with the actual deviceId logic

// Event listener for real-time input
function updateStarCount() {
  let name;
  if(infopage){
  name = nameInput.value.trim();}
  else{
    name = userName;
  }

  // Only search if the name has characters
  if (name) {
    getUserPointsByDeviceId(name, deviceId)
      .then(points => {
        starCountDiv.innerHTML = `${points} &#9733;`;  // Show points with the star symbol
      })
      .catch(error => {
        starCountDiv.innerHTML = "0 &#9733;";  // Default to 0 with the star symbol
        console.error(error);
      });
  } else {
    starCountDiv.innerHTML = "0 &#9733;";  // Default to 0 when input is empty
  }
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
            addUser(nameInput,0);
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
