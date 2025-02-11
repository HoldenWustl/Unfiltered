

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
  function updateLeaderboard(snapshot) {
    const leaderboardList = document.getElementById("leaderboard-list");
    leaderboardList.innerHTML = ""; // Clear current list

    const users = [];
    snapshot.forEach(childSnapshot => {
      const data = childSnapshot.val();
      users.push({ name: data.name, points: data.points });
    });

    users.reverse().forEach(user => {
      const li = document.createElement("li");
      li.innerHTML = `${user.name} <span>${user.points}</span>`;
      leaderboardList.appendChild(li);
    });
  }

  // Listen for changes and update leaderboard
  onValue(query(leaderboardRef, orderByChild("points"), limitToLast(10)), updateLeaderboard);

  // Function to add/update user score
  function addUser(username, points) {
    const userRef = ref(db, `leaderboard/${username}`);
    const deviceId = getDeviceId();
    // Check if user already exists
    get(userRef).then(snapshot => {
      if (!snapshot.exists()) {
        set(userRef, { name: username, points, deviceId })
          .then(() => console.log(`${username} added with ${points} points.`))
          .catch(error => console.error("Error adding user:", error));
      } else {
        console.log(`${username} already exists.`);
      }
    });
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
    const userRef = ref(db, `leaderboard/${username}`);

    get(userRef).then(snapshot => {
      if (snapshot.exists()) {
        const currentPoints = snapshot.val().points;
        const newPoints = currentPoints + amount;

        update(userRef, { points: newPoints })
          .then(() => console.log(`${username}'s score increased by ${amount} to ${newPoints}.`))
          .catch(error => console.error("Error incrementing score:", error));
      } else {
        console.log(`${username} does not exist.`);
      }
    });
  }

  function getUserPointsByDeviceId(name, deviceId) {
    // Reference to the leaderboard
    const leaderboardRef = ref(db, "leaderboard");
  
    return new Promise((resolve, reject) => {
      // Query the leaderboard to find the user with the given name and deviceId
      const userQuery = query(leaderboardRef, orderByChild("name"), equalTo(name));
      
      get(userQuery).then(snapshot => {
        if (snapshot.exists()) {
          let userPoints = 0; // Default to 0
  
          snapshot.forEach(childSnapshot => {
            const userData = childSnapshot.val();
            // Check if the deviceId matches
            if (userData.deviceId === deviceId) {
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
  

  const nameInput = document.getElementById("name");
const starCountDiv = document.getElementById("star-count");

// Example deviceId (this could come from the user's session or be dynamically assigned)
 // Replace this with the actual deviceId logic

// Event listener for real-time input
nameInput.addEventListener("input", function () {
  const name = nameInput.value.trim();

  // Only search if the name has characters
  if (name) {
    // Fetch user points and update star count
    getUserPointsByDeviceId(name, deviceId)
      .then(points => {
        // Update the star-count div with the user's points and display the star symbol
        starCountDiv.innerHTML = `${points} &#9733;`;  // Show points followed by the star symbol
      })
      .catch(error => {
        // Handle any errors, maybe update the count as 0 if an error occurs
        starCountDiv.innerHTML = "0 &#9733;";  // Default to 0 with the star symbol
        console.error(error);
      });
  } else {
    // Clear the star count if there's no input
    starCountDiv.innerHTML = "0 &#9733;";  // Default to 0 with the star symbol when input is empty
  }
  
});
addUser("Teste",400);
