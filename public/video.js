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
const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
let iceCandidateQueue = [];
let localStreamReady = false;

async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localStream) {
      localVideo.srcObject = localStream;
      localStreamReady = true;
      console.log("Local stream is ready.");
    }
  } catch (error) {
    console.error("Error accessing camera/microphone:", error);
    alert("Could not access camera/microphone. Please allow permissions.");
  }
}

async function ensureLocalStream() {
  if (!localStreamReady) {
    console.log("Local stream not ready, waiting...");
    await startCamera();
  }
}

startCamera();

// Emit to server to join the video chat
socket.emit('joinVideoChat', { userName, age });
document.getElementById("status").textContent = "Finding someone...";

// Handle pairing
socket.on('pairedForVideo', async (otherUser) => {
  console.log('Paired for video with:', otherUser);
  await ensureLocalStream();
  hideWaitingForMatch();
  otherUserName = otherUser.userName;
  otherUserAge = otherUser.age;
  document.getElementById("status").textContent = `Randomly matched with ${otherUserName}, Age: ${otherUserAge}`;

  if (!peerConnection) {
    console.log("Creating peer connection...");
    await createPeerConnection();
    console.log("Creating offer...");
    await createOffer();
  }
});

socket.on('waitingForVideoPair', (reconnecting) => {
  setTimeout(() => {
    console.log('Waiting for video pair...');
    showWaitingForMatch();
    document.getElementById("status").textContent = reconnecting ?
      "Your partner left. Searching for a new match..." :
      "Waiting for someone to join...";
    remoteVideo.srcObject = null;
  }, 2000);
});

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
    location.reload(); // Refresh after a short delay
  }, 1000);
});

// When the user refreshes the page
window.addEventListener('beforeunload', () => {
  console.log('User is refreshing the page...');
  socket.emit('refresh');
});

document.getElementById("leave-btn").addEventListener("click", () => {
  console.log("User is leaving the chat...");
  socket.emit("leaveVideoChat");
  window.location.href = "info.html";
});

// Function to create a peer connection
let addedTracks = new Set();

async function createPeerConnection() {
  await ensureLocalStream();
  if (!localStream) {
    console.error("Local stream not available.");
    return;
  }

  console.log("Creating RTCPeerConnection...");
  peerConnection = new RTCPeerConnection({ iceServers });

  // Add local stream tracks to the peer connection, if not already added
  localStream.getTracks().forEach(track => {
    if (!addedTracks.has(track)) {
      console.log("Adding track to peer connection:", track);
      peerConnection.addTrack(track, localStream);
      addedTracks.add(track);
    }
  });

  peerConnection.onicecandidate = (event) => {
    console.log("ICE candidate event:", event);
    if (event.candidate) {
      console.log("Sending ICE candidate to server...");
      socket.emit('candidate', event.candidate);
    }
  };

  // Set up remote stream
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  peerConnection.ontrack = (event) => {
    console.log("ontrack event fired!");
    if (event.streams && event.streams[0]) {
      event.streams[0].getTracks().forEach(track => {
        console.log("Adding track to remote stream:", track);
        remoteStream.addTrack(track);  // Ensure the remote stream is updated here
      });
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === 'failed') {
      console.error('ICE connection failed');
      // Try to reconnect or restart the peer connection
    }
  };
}

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

async function processQueuedIceCandidates() {
  if (peerConnection && peerConnection.remoteDescription) {
    while (iceCandidateQueue.length > 0) {
      let candidate = iceCandidateQueue.shift();
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }
}

socket.on('offer', async (offer) => {
  console.log("Received offer:", offer);
  if (peerConnection) {
    console.log("Already have a peer connection.");
    return;
  }
  await ensureLocalStream();
  await createPeerConnection();

  if (!peerConnection) {
    console.error("Failed to create peer connection.");
    return;
  }

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await processQueuedIceCandidates();

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
      await processQueuedIceCandidates();
    } catch (error) {
      console.error("Error setting remote description for answer:", error);
    }
  }
});

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
