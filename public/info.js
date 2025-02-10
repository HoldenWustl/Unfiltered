    sessionStorage.removeItem("kicked");
    const userForm = document.getElementById('name');
    const savedValue = sessionStorage.getItem('name');
    if (savedValue) {
      userForm.value = savedValue; // Set the input field to the saved value
    }
    // Age slider functionality
    const ageSlider = document.getElementById('age');
    const ageValue = document.getElementById('age-display');

    // ageSlider.addEventListener('input', function() {
    //   ageValue.textContent = ageSlider.value;
    // });

   

    function updateAgeValue() {
      let age = parseInt(document.getElementById("age").value); // Get the age value and parse it as an integer

  if (age === 40) {
    document.getElementById("age-display").textContent = "40+"; // If the age is exactly 40, display "40+"
  } else {
    document.getElementById("age-display").textContent = age; // Otherwise, display the age
  }
  }

  
  const ageDisplay = document.getElementById("age-display");

  ageSlider.addEventListener("input", function () {
      

      // Add pop effect
      ageDisplay.classList.add("pop");

      // Remove pop effect after animation (smooth reset)
      setTimeout(() => {
          ageDisplay.classList.remove("pop");
      }, 200);
  });

  function startChat() {
    event.preventDefault(); 
    // Get the value of the name input field
    const nameInput = document.getElementById('name').value;

    // Check if the name input is empty
    if (nameInput.trim() === "") {
        alert("Please enter your name before starting the chat!");
    } else {
        // If name input is filled, redirect to the chat page (chat.html)
      sessionStorage.setItem('name', nameInput);
        window.location.href = `chat.html?userName=${encodeURIComponent(nameInput.trim())}`; 
    }
}
function startVideo() {
    event.preventDefault(); 
    // Get the value of the name input field
    const nameInput = document.getElementById('name').value;
    const ageInput = document.getElementById('age-display').innerText;
    // Check if the name input is empty
    if (nameInput.trim() === "") {
        alert("Please enter your name before starting the chat!");
    } else {
        // If name input is filled, redirect to the chat page (chat.html)
      sessionStorage.setItem('name', nameInput);
        window.location.href = `video.html?userName=${encodeURIComponent(nameInput.trim())}&age=${encodeURIComponent(ageInput)}`;
    }
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, orderByChild, query, limitToLast, get } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-database.js";

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
      li.innerHTML = `${user.name}: <span>${user.points}</span>`;
      leaderboardList.appendChild(li);
    });
  }

  // Listen for changes and update leaderboard
  onValue(query(leaderboardRef, orderByChild("points"), limitToLast(10)), updateLeaderboard);

  // Function to add/update user score
  function addUser(username, points) {
    const userRef = ref(db, `leaderboard/${username}`);

    // Check if user already exists
    get(userRef).then(snapshot => {
      if (!snapshot.exists()) {
        set(userRef, { name: username, points })
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
  
