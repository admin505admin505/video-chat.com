const socket = io(window.location.origin);

const form = document.querySelector('#roomform');
const loginform = document.querySelector('#joinroom');
const videos = document.querySelector('#chatroom');
const remotevideos = document.querySelector('#remotevideos')

const localVideo = document.querySelector('#localVideo');
const mediaconstraints = { video: { width: 9999, height: 9999 }, audio: true };

const config = {
  'iceServers': [{
    'urls': ['stun:stun.l.google.com:19302']
  }]
};

let peers = {};

form.onsubmit = (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  const roomcode = formData.get("roomcode");
  const username = formData.get("username");

  getmediaDevices(roomcode, username);
}

// Get Devices //

function getmediaDevices(roomcode, username) {
  navigator.mediaDevices.getUserMedia(mediaconstraints).then(stream => {
    localVideo.srcObject = stream;
    loginform.style.display = "none";
    videos.style.display = "flex";
    document.body.style.backgroundColor = "rgb(75, 75, 75)";

    socket.emit('Join', roomcode, username);
  });
}

// User Joining / Leaving //

socket.on('User Joined', (id, username) => {
  if (id == socket.id) socket.username = username;

  const peerConnection = new RTCPeerConnection(config);
  peers[id] = peerConnection;
  peerConnection.addStream(localVideo.srcObject);
  peerConnection.createOffer()
  .then(sdp => peerConnection.setLocalDescription(sdp))
  .then(() => {
    socket.emit('Send Offer', id, peerConnection.localDescription);
  })
  peerConnection.onaddstream = e => handleStream(e.stream, id)
  peerConnection.onicecandidate = function(e) {
    if (e.candidate) {
      socket.emit('Send Candidate', id, e.candidate);
    }
  }
});

socket.on('User Left', (id) => {
  if (!id) return;
  peers[id].close();
  peers[id].onaddstream = null;
  peers[id].onicecandidate = null;
  delete peers[id];

  const vid = document.querySelector(`#${id}`);
  vid.remove();
});

// Offers //

socket.on('Got Offer', (id, desc) => {
  const peerConnection = new RTCPeerConnection(config);
  peers[id] = peerConnection;
  peerConnection.addStream(localVideo.srcObject);
  peerConnection.setRemoteDescription(desc)
  .then(() => peerConnection.createAnswer())
  .then(sdp => peerConnection.setLocalDescription(sdp))
  .then(() => {
    socket.emit('Send Answer', id, peerConnection.localDescription);
  })
  peerConnection.onaddstream = e => handleStream(e.stream, id)
  peerConnection.onicecandidate = function(e) {
    if (e.candidate) {
      socket.emit('Send Candidate', id, e.candidate);
    }
  }
});

// Answer //

socket.on("Got Answer", (id, desc) => {
  peers[id].setRemoteDescription(desc);
});

// Candidates //

socket.on('Got Candidate', (id, candidate) => {
  peers[id].addIceCandidate(new RTCIceCandidate(candidate));
});


// Handle Streams //

function handleStream(stream, id) {
  const remotevideo = document.createElement('video');
  remotevideo.setAttribute("id", id);
  remotevideo.setAttribute("class", "remotevideo");
  // remotevideo.setAttribute("playsinline", "true");
  remotevideo.muted = false;
  remotevideo.autoplay = true;
  remotevideo.srcObject = stream;

  remotevideos.appendChild(remotevideo);
}
