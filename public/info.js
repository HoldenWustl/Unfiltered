const socket = io();

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
        let starCount = document.getElementById('star-count').textContent;
        window.location.href = `video.html?userName=${encodeURIComponent(nameInput.trim())}&age=${encodeURIComponent(ageInput)}&stars=${encodeURIComponent(starCount)}`;
    }
}



window.onload = () => {
setTimeout(() => {
socket.on("connect", () => {
  console.log("🔗 Connected to WebSocket server");
});
    
socket.on("payment-success", (data) => {
  console.log(`✅ Payment successful for ${data.email}`);
});
    
socket.on("disconnect", () => {
  console.log("❌ Disconnected from WebSocket server");
});
    }, 1000);
}



// This is your Stripe public key
const stripe = Stripe('pk_live_51QsZVcRxTYiZzB69SpU7q13vCSMYj1sJwvY7wQDYk2Rm0C8nZyeu03y7KceScHeumpgLzvHY47ilzTXxdRHE7ocR00OYLgZvea');

document.getElementById('checkout-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const nameInput = document.getElementById('name').value;

  // Check if the name input is empty
  if (nameInput.trim() === "") {
    alert("Please enter your name for stars!");
  } else {
    try {
      const response = await fetch('/create-checkout-session', {
        method: 'POST',
      });

      if (response.ok) {
        const session = await response.json();

        // Redirect to the Stripe Checkout page
        const { error } = await stripe.redirectToCheckout({ sessionId: session.id });

        if (error) {
          // Handle any errors that occur during redirection
          console.error(error.message);
        }
      } else {
        console.error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error during checkout process:', error);
    }
  }
});
