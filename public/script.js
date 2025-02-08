const hero = document.querySelector('.hero');
let ripple;

hero.addEventListener('mousemove', function (event) {
  // Ensure a ripple exists to follow the cursor
  if (!ripple) {
    ripple = document.createElement('div');
    ripple.classList.add('ripple');
    hero.appendChild(ripple);
  }

  // Update ripple position to follow the cursor
  const mouseX = event.clientX - hero.getBoundingClientRect().left;
  const mouseY = event.clientY - hero.getBoundingClientRect().top;

  ripple.style.left = `${mouseX - 15}px`; // Center the ripple
  ripple.style.top = `${mouseY - 15}px`;
});

hero.addEventListener('mousedown', function () {
  if (ripple) {
    // Trigger ripple grow and fade-out animation
    ripple.classList.add('expand');
    ripple.addEventListener(
      'animationend',
      () => {
        ripple.remove(); // Remove the old ripple after the animation
        ripple = null;   // Allow a new ripple to be created
      },
      { once: true }
    );
  }
});
hero.addEventListener('mouseleave', function () {
  // Remove ripple if the mouse leaves the hero section
  if (ripple) {
    ripple.remove();
    ripple = null;
  }
});


function scrollToSection(sectionId) {
  // Prevent default behavior if this function is triggered by a link or event
  event?.preventDefault();

  // Get the target section or handle 'home'
  const targetSection = sectionId === 'home' ? document.documentElement : document.getElementById(sectionId);

  // Exit if the target section doesn't exist
  if (!targetSection) return;

  // Calculate the current scroll position and target position
  const currentScroll = Math.round(window.scrollY);
  const targetPosition = sectionId === 'home' ? 0 : Math.round(targetSection.offsetTop);

  // Exit if already at the target position
  if (Math.abs(currentScroll - targetPosition) <= 5) return;

  // Scroll to the target position
  window.scrollTo({ top: targetPosition, behavior: 'smooth' });
}

const socket = io({
    extraHeaders: { 'user-id': sessionStorage.getItem('userId') || Math.random().toString(36).substr(2, 9) }
});

if (!sessionStorage.getItem('userId')) {
    sessionStorage.setItem('userId', socket.io.opts.extraHeaders['user-id']);
}

socket.on('onlineCount', (count) => {
    document.getElementById("online-count").innerText = `${count} people online`;
});
