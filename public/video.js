var socket = io.connect();
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
    urls: "turn:global.relay.metered.ca:80?transport=tcp",
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

// Ensure local stream is ready before proceeding with the connection
async function ensureLocalStream() {
  if (!localStreamReady) {
    console.log("Local stream not ready, waiting...");
    await startCamera(); // Wait for local stream to be available
  }
}

startCamera();
// Emit to server to join the video chat
socket.emit('joinVideoChat', { userName, age });
document.getElementById("status").textContent = "Finding someone...";

// Handle pairing
socket.on('pairedForVideo', async (otherUser) => {
  await ensureLocalStream();
  console.log('Paired for video with:', otherUser);
  hideWaitingForMatch();
  otherUserName = otherUser.userName;
  otherUserAge = otherUser.age;
  document.getElementById("status").textContent = `Randomly matched with ${otherUserName}, Age: ${otherUserAge}`;

  // Wait for the local stream to be ready before creating the peer connection and sending offer
  await ensureLocalStream();
  if (!peerConnection) {
    console.log("Creating peer connection...");
    createPeerConnection(); // Create the peer connection only after stream is ready
    console.log("Creating offer...");
    await createOffer(); // Create and send the offer to the other user
  }
});

// Waiting for someone to join
socket.on('waitingForVideoPair', (reconnecting) => {
  setTimeout(() => {
  console.log('Waiting for video pair...');
  showWaitingForMatch();
  document.getElementById("status").textContent = reconnecting ? 
    "Your partner left. Searching for a new match..." : 
    "Waiting for someone to join...";
  remoteVideo.srcObject = null;
  },2000);
});

// When the other user leaves
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
  setTimeout(() => {
    location.reload(); // Refresh the page after a short delay
  }, 1000);
});
// When the user refreshes the page
window.addEventListener('beforeunload', () => {
  console.log('User is refreshing the page...');
  socket.emit('refresh');
});

// Leave chat handler
document.getElementById("leave-btn").addEventListener("click", () => {
  console.log("User is leaving the chat...");
  socket.emit("leaveVideoChat");
  window.location.href = "info.html";
});

// Function to create a peer connection
// Function to create a peer connection
let addedTracks = new Set(); // To track which tracks are already added


async function createPeerConnection() {
  ensureLocalStream();
  if (!localStream) {
    console.error("Local stream not available.");
    return;
  }

  console.log("Creating RTCPeerConnection...");
  peerConnection = new RTCPeerConnection({ iceServers: iceServers });

  // Add local stream tracks to the peer connection, if not already added
  await Promise.all(localStream.getTracks().map(track => {
    if (!addedTracks.has(track)) {
      console.log("Adding track to peer connection:", track);
      peerConnection.addTrack(track, localStream);
      addedTracks.add(track);
    }
  }));

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    console.log("ICE candidate event:", event);
    if (event.candidate) {
      console.log("Sending ICE candidate to server...");
      socket.emit('candidate', event.candidate);
    }
  };

  // Handle remote stream
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;
  
  peerConnection.ontrack = (event) => {
    console.log("ontrack event fired!");
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
    }
    event.streams[0].getTracks().forEach(track => {
      console.log("Adding track to remote stream:", track);
      remoteStream.addTrack(track);
    });
  };

  // Create an offer only after tracks are fully added
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  
  // Send the offer to the server
  socket.emit("offer", offer);

  console.log("Offer created and sent");
}



// Handle receiving ICE candidates

// Function to start the connection process
async function startConnection() {
  await createPeerConnection();
}

// Call startConnection() to initialize everything when appropriate (e.g., after getting the local stream)




// Handle receiving ICE candidates
socket.on('candidate', async (candidate) => {
  console.log("Received ICE candidate:", candidate);
  if (peerConnection && peerConnection.remoteDescription) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  } else {
    console.log("ICE candidate received before remote description. Queueing it.");
    iceCandidateQueue.push(candidate);
  }
});

socket.on('offer', async (offer) => {
  console.log("Received offer:", offer);
  if (peerConnection) {
    console.log("Already have a peer connection.");
    return;
  }
  await ensureLocalStream();
  createPeerConnection();

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    iceCandidateQueue.forEach(candidate => peerConnection.addIceCandidate(new RTCIceCandidate(candidate)));
    iceCandidateQueue = [];

    console.log("Creating answer...");
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log("Sending answer to server...");
    socket.emit('answer', answer);
  } catch (error) {
    console.error("Error handling offer:", error);
  }
});

socket.on('answer', async (answer) => {
  console.log("Received answer:", answer);
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
    console.error("Local stream is still not available when creating offer.");
    return;
  }

  try {
    console.log("Creating offer...");
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log("Sending offer to server...");
    socket.emit('offer', offer);
  } catch (error) {
    console.error("Error creating offer:", error);
  }
}

function showWaitingForMatch() {
  console.log("Showing waiting for match...");
  document.getElementById("loading-symbol").style.display = "block";
}

function hideWaitingForMatch() {
  console.log("Hiding waiting for match...");
  document.getElementById("loading-symbol").style.display = "none";
}

startConnection();
