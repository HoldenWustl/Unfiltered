const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const userName = urlParams.get('userName') || 'User';
const age = urlParams.get('age') || 'Unknown';
let otherUserName = null;
let otherUserAge = null;
let localStream;
let remoteStream;
let peerConnection = null;
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
let iceCandidateQueue = [];
const iceServers = { urls: 'stun:stun.l.google.com:19302' };

// Flag to track whether the local stream is ready
let localStreamReady = false;

// Start the camera for the local stream
async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localStream) {
      localVideo.srcObject = localStream; // Immediately show local stream for the first user
      localStreamReady = true; // Local stream is ready
      console.log("Local stream is ready.");
    } else {
      console.error("Local stream is not available.");
    }
  } catch (error) {
    console.error("Error accessing camera/microphone:", error);
    alert("Could not access camera/microphone. Please allow permissions.");
  }
}

// Initialize camera for the first user right away
startCamera();

// Emit to server to join the video chat
socket.emit('joinVideoChat', { userName, age });
document.getElementById("status").textContent = "Finding someone...";
showWaitingForMatch();
// Handle pairing
socket.on('pairedForVideo', async (otherUser) => {
  hideWaitingForMatch();
  otherUserName = otherUser.userName;
  otherUserAge = otherUser.age;
  document.getElementById("status").textContent = `Randomly matched with ${otherUserName}, Age: ${otherUserAge}`;

  // Create peer connection and offer only after stream is ready
  if (!peerConnection) {
    await ensureLocalStream(); // Ensure local stream is ready before starting the connection
    createPeerConnection();
    createOffer();
  }
});

// Waiting for someone to join
socket.on('waitingForVideoPair', (reconnecting) => {
  showWaitingForMatch();
  document.getElementById("status").textContent = reconnecting ? 
    "Your partner left. Searching for a new match..." : 
    "Waiting for someone to join...";
  remoteVideo.srcObject = null;
});

// When the other user leaves
socket.on('videoUserLeft', () => {
  document.getElementById("status").textContent = `${otherUserName} has left the chat.`;
  otherUserName = null;
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  setTimeout(() => {
    location.reload(); // Refresh the page after a short delay
  }, 1000);
});

// Leave chat handler
document.getElementById("leave-btn").addEventListener("click", () => {
  socket.emit("leaveVideoChat");
  window.location.href = "info.html";
});

// Function to create a peer connection
function createPeerConnection() {
  if (!localStream) {
    console.error("Local stream is not available when creating peer connection.");
    return;
  }

  peerConnection = new RTCPeerConnection({ iceServers: [iceServers] });

  // Add local stream tracks to the peer connection
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Handle ICE candidate
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    if (remoteVideo) remoteVideo.srcObject = remoteStream;
  };
}

// Function to create and send an offer
async function createOffer() {
  if (!localStream) {
    console.error("Local stream is still not available when creating offer.");
    return;
  }

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
  } catch (error) {
    console.error("Error creating offer:", error);
  }
}

// Handle offer from the other user
socket.on('offer', async (offer) => {
  if (peerConnection) {
    console.log("Already have a peer connection.");
    return;
  }

  // Create a new peer connection for the incoming offer
  await ensureLocalStream(); // Ensure local stream is ready before proceeding
  createPeerConnection();

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Process queued ICE candidates

    iceCandidateQueue.forEach(candidate => peerConnection.addIceCandidate(new RTCIceCandidate(candidate)));

    iceCandidateQueue = [];
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
  } catch (error) {
    console.error("Error handling offer:", error);
  }
});

// Handle the answer from the other user
socket.on('answer', async (answer) => {
  if (peerConnection) {
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error("Error setting remote description for answer:", error);
    }
  }
});

// Handle ICE candidates
socket.on('candidate', (candidate) => {
  if (peerConnection && peerConnection.remoteDescription) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(error => {
      console.error("Error adding ICE candidate:", error);
    });
  } else {
    console.log("ICE candidate received before remote description. Queueing it.");
    iceCandidateQueue.push(candidate);
  }
});

// Ensures that the local stream is ready for use
async function ensureLocalStream() {
  if (!localStreamReady) {
    console.log("Local stream not ready, waiting...");
    await startCamera(); // Wait for local stream to be available
  }
}

function showWaitingForMatch() {
  document.getElementById("loading-symbol").style.display = "block";
}

function hideWaitingForMatch() {
  document.getElementById("loading-symbol").style.display = "none";
}
