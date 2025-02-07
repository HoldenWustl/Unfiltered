


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
let forcedReload = false;
const myIceServers = [
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
async function getUserMediaWithPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return stream;
  } catch (err) {
    console.error("User denied media permissions:", err);
    alert("Please enable camera and microphone access.");
    return null;
  }
}

// Ensure local stream is ready before proceeding with the connection
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
  await ensureLocalStream();
  console.log('Paired for video with:', otherUser);
  hideWaitingForMatch();
  otherUserName = otherUser.userName;
  otherUserAge = otherUser.age;
  document.getElementById("status").textContent = `Randomly matched with ${otherUserName}, Age: ${otherUserAge}`;

  // Create peer connection if not already created
  if (!peer) {
    console.log("Creating peer...");
    createPeer();  // Create peer and initiate connection
  }

  // Once peer is created, initiate the call to the other user
  const stream = await getUserMediaWithPermissions();
  if (!stream) return;  // Don't continue if stream is null

  const call = peer.call(otherUserName, stream);
  call.on('stream', (remoteStream) => {
  console.log("Remote stream received!");
  remoteVideo.srcObject = remoteStream;

  // Try playing the video & catch any autoplay errors
  remoteVideo.play().catch((e) => console.error("Video play failed:", e));
  });
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
  }, 2000);
});

// When the other user leaves
socket.on('videoUserLeft', () => {
  console.log(`${otherUserName} has left the chat.`);
  document.getElementById("status").textContent = `${otherUserName} has left the chat.`;
  otherUserName = null;
  if (peer) {
    console.log("Closing peer connection...");
    peer.destroy();
  }
  remoteVideo.srcObject = null;
  forcedReload = true
  setTimeout(() => {
    location.reload();
  }, 1000);
});

window.addEventListener("pageshow", function () {
    const entries = performance.getEntriesByType("navigation");
    if (entries.length > 0 && entries[0].type === "reload") {
        console.log("Page was refreshed!");
        // Trigger your custom function
        if (!forcedReload) {
      console.log("User is leaving the chat...");
    setTimeout(() => leaveChat(), 500);
    }
    }
});
window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && !forcedReload) {
        console.log("User is leaving the chat...");
        setTimeout(() => leaveChat(), 500);
    }
});
// When the user refreshes the page
window.addEventListener("beforeunload", () => {
    if (!forcedReload) {
      console.log("User is leaving the chat...");
    setTimeout(() => leaveChat(), 500);
    }
    
});
window.addEventListener("load", () => {
    if (sessionStorage.getItem("kicked") === "true") {
        window.location.href = "info.html"; // Redirect them
    }
});


// Leave chat handler
document.getElementById("leave-btn").addEventListener("click", () => {
  console.log("User is leaving the chat...");
  socket.emit("leaveVideoChat");
  window.location.href = "info.html";

});
function leaveChat() {
    sessionStorage.setItem("kicked", "true");
    socket.emit("leaveVideoChat");
}
// Function to create a PeerJS peer and handle communication
let peer; // Initialize PeerJS peer object

function createPeer() {
  
  // Initialize PeerJS with your server configuration
  peer = new Peer(userName, {
  config: { iceServers: myIceServers },
  host: 'peerjs-server-production-1731.up.railway.app', // Use your Railway URL here
  port: 443, // Use port 443 for secure WebSocket (wss://)
  path: '/myapp', // Ensure this matches the path used in your PeerJS server
  secure: true, // Enable secure WebSocket (wss://)
});


  // Handle PeerJS connection open event
  peer.on('open', (id) => {
    console.log('Peer open with ID:', id);
    // Now you can make the call to the other user after peer is open
    const call = peer.call(otherUserName, localStream);
    call.on('stream', (remoteStream) => {
      console.log("Remote stream received!");
      remoteVideo.srcObject = remoteStream;  // Set the remote video stream to your element
    });
  });

  // Handle incoming calls (when other user calls you)
  peer.on('call', async (call) => {
    console.log("Incoming call...");
    
    // Answer the call with the local stream
    if (localStream) {
      call.answer(localStream);  // Answer and send local stream
      
      // When the remote stream is received, attach it to the remote video element
      call.on('stream', (remoteStream) => {
        console.log("Remote stream received!");
        remoteVideo.srcObject = remoteStream;  // Display remote video
      });
    }
  });
  peer.on('close', () => {

});
}


function setupPeerConnection(conn) {
  conn.on('open', () => {
    console.log("Connection established with:", conn.peer);
  });

  conn.on('data', (data) => {
    console.log("Received data:", data);
  });

  conn.on('close', () => {
    console.log("Connection closed.");
  });
}

// Function to show waiting for match symbol
function showWaitingForMatch() {
  console.log("Showing waiting for match...");
  document.getElementById("loading-symbol").style.display = "block";
}

function hideWaitingForMatch() {
  console.log("Hiding waiting for match...");
  document.getElementById("loading-symbol").style.display = "none";
}

