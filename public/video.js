// Initializing socket and user details
var socket = io.connect();
const urlParams = new URLSearchParams(window.location.search);
const userName = urlParams.get('userName') || 'User';
const age = urlParams.get('age') || 'Unknown';

let otherUserName = null;
let otherUserAge = null;
let localStream;
let remoteStream;
let peerConnection = null;
let iceCandidateQueue = [];
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");

// ICE Servers for WebRTC
const iceServers = [
  {
    urls: "stun:stun.relay.metered.ca:80",
  },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "24f50eaa40fe5b3385c2413b",
    credential: "yNKdn0DH6LknYKXq",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "24f50eaa40fe5b3385c2413b",
    credential: "yNKdn0DH6LknYKXq",
  },
  {
    urls: "turns:global.relay.metered.ca:443?transport=tcp",
    username: "24f50eaa40fe5b3385c2413b",
    credential: "yNKdn0DH6LknYKXq",
  },
];

// Flag to track whether the local stream is ready
let localStreamReady = false;

// Start the camera for the local stream
async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localStream) {
      localVideo.srcObject = localStream;
      localStreamReady = true;
      console.log("Local stream is ready.");
    } else {
      console.error("Local stream is not available.");
    }
  } catch (error) {
    console.error("Error accessing camera/microphone:", error);
    alert("Could not access camera/microphone. Please allow permissions.");
  }
}

// Ensure local stream is ready before proceeding
async function ensureLocalStream() {
  if (!localStreamReady) {
    console.log("Local stream not ready, waiting...");
    await startCamera();
  }
}

// Emit to server to join the video chat
socket.emit('joinVideoChat', { userName, age });
document.getElementById("status").textContent = "Finding someone...";

// Handle pairing
socket.on('pairedForVideo', async (otherUser) => {
  await ensureLocalStream();
  otherUserName = otherUser.userName;
  otherUserAge = otherUser.age;
  document.getElementById("status").textContent = `Matched with ${otherUserName}, Age: ${otherUserAge}`;
  
  // Create peer connection and offer after pairing
  if (!peerConnection) {
    createPeerConnection();
    await createOffer();
  }
});

// Handle waiting for video pair
socket.on('waitingForVideoPair', (reconnecting) => {
  console.log('Waiting for video pair...');
  showWaitingForMatch();
  document.getElementById("status").textContent = reconnecting ? 
    "Your partner left. Searching for a new match..." : 
    "Waiting for someone to join...";
  remoteVideo.srcObject = null;
});

// Handle when the other user leaves
socket.on('videoUserLeft', () => {
  console.log(`${otherUserName} has left the chat.`);
  document.getElementById("status").textContent = `${otherUserName} has left the chat.`;
  otherUserName = null;
  
  if (peerConnection) {
    console.log("Closing peer connection...");
    peerConnection.close();
    peerConnection = null;
  }
  
  remoteVideo.srcObject = null;
  setTimeout(() => location.reload(), 1000);
});

// Handle page refresh
window.addEventListener('beforeunload', () => {
  console.log('User is refreshing the page...');
  socket.emit('refresh');
});

// Handle user leaving the chat
document.getElementById("leave-btn").addEventListener("click", () => {
  console.log("User is leaving the chat...");
  socket.emit("leaveVideoChat");
  window.location.href = "info.html";
});

// Function to create a peer connection
async function createPeerConnection() {
  if (!localStream) {
    console.error("Local stream is not available.");
    return;
  }

  console.log("Creating RTCPeerConnection...");
  peerConnection = new RTCPeerConnection({ iceServers });

  // Add local stream tracks
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };

  // Handle remote stream
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });
  };
}

// Handle receiving ICE candidates
socket.on('candidate', async (candidate) => {
  if (peerConnection && peerConnection.remoteDescription) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  } else {
    iceCandidateQueue.push(candidate);
  }
});

// Handle receiving an offer
socket.on('offer', async (offer) => {
  if (peerConnection) return; // If already connected, ignore the offer
  
  await ensureLocalStream();
  createPeerConnection();
  
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    iceCandidateQueue.forEach(candidate => peerConnection.addIceCandidate(new RTCIceCandidate(candidate)));
    iceCandidateQueue = [];

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
  } catch (error) {
    console.error("Error handling offer:", error);
  }
});

// Handle receiving an answer
socket.on('answer', async (answer) => {
  if (peerConnection) {
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error("Error setting remote description for answer:", error);
    }
  }
});

// Function to create and send an offer
async function createOffer() {
  if (!localStream) {
    console.error("Local stream is not available.");
    await ensureLocalStream();
    return createOffer();  // Retry after stream is ready
  }

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
  } catch (error) {
    console.error("Error creating offer:", error);
  }
}

// Show waiting for match status
function showWaitingForMatch() {
  document.getElementById("loading-symbol").style.display = "block";
}

// Hide waiting for match status
function hideWaitingForMatch() {
  document.getElementById("loading-symbol").style.display = "none";
}

// Initialize connection
startCamera();
startConnection();
