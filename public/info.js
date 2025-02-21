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





socket.on("connect", () => {
  console.log("🔗 Connected to WebSocket server");
});
    
socket.on("payment-success", (data) => {
  console.log(`✅ Payment successful for ${data.productName}`);
});
    
socket.on("disconnect", () => {
  console.log("❌ Disconnected from WebSocket server");
});



// This is your Stripe public key
const stripe = Stripe('pk_live_51QsZVcRxTYiZzB69SpU7q13vCSMYj1sJwvY7wQDYk2Rm0C8nZyeu03y7KceScHeumpgLzvHY47ilzTXxdRHE7ocR00OYLgZvea');

document.getElementById('product-1-btn').addEventListener('click', async (event) => {
    event.preventDefault();
    
    // Make request for product 1
    const response = await fetch('/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ product: '100 Stars' }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const session = await response.json();
      stripe.redirectToCheckout({ sessionId: session.id });
    } else {
      console.error('Failed to create checkout session for product 1');
    }
  });

  document.getElementById('product-2-btn').addEventListener('click', async (event) => {
    event.preventDefault();
    
    // Make request for product 2
    const response = await fetch('/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ product: 'Premium T-shirt' }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const session = await response.json();
      stripe.redirectToCheckout({ sessionId: session.id });
    } else {
      console.error('Failed to create checkout session for product 2');
    }
  });
