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
     console.log(currentStars);
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
