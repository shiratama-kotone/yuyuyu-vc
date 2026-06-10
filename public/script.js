var socket = io();

var localStream;
var peers = {};

var servers = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

async function start() {

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  addVideo(localStream, "自分");

}

document.getElementById("joinBtn").onclick = async () => {

  await start();

  var room = room.value;
  var name = name.value;

  socket.emit("join-room", {
    room,
    name
  });

  join.style.display = "none";
  app.style.display = "block";

};

socket.on("users", users => {

  users.forEach(async user => {

    if(user.id === socket.id) return;

    createPeer(user.id, true);

  });

});

socket.on("user-joined", user => {

  createPeer(user.id, false);

});

socket.on("signal", async data => {

  var peer = peers[data.from];

  if(!peer) {
    peer = createPeer(data.from, false);
  }

  if(data.signal.type === "offer") {

    await peer.setRemoteDescription(
      new RTCSessionDescription(data.signal)
    );

    var answer = await peer.createAnswer();

    await peer.setLocalDescription(answer);

    socket.emit("signal", {
      to: data.from,
      signal: peer.localDescription
    });

  }

  else if(data.signal.type === "answer") {

    await peer.setRemoteDescription(
      new RTCSessionDescription(data.signal)
    );

  }

  else if(data.signal.candidate) {

    try{
      await peer.addIceCandidate(data.signal);
    }catch(e){}
  }

});

function createPeer(id, initiator) {

  var peer = new RTCPeerConnection(servers);

  peers[id] = peer;

  localStream.getTracks().forEach(track => {
    peer.addTrack(track, localStream);
  });

  peer.ontrack = e => {
    addVideo(e.streams[0], id);
  };

  peer.onicecandidate = e => {

    if(e.candidate) {

      socket.emit("signal", {
        to:id,
        signal:e.candidate
      });

    }

  };

  if(initiator) {

    peer.createOffer()
    .then(offer => peer.setLocalDescription(offer))
    .then(() => {

      socket.emit("signal", {
        to:id,
        signal:peer.localDescription
      });

    });

  }

  return peer;

}

function addVideo(stream, id) {

  if(document.getElementById(id)) return;

  var video = document.createElement("video");

  video.id = id;
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;

  document.getElementById("videos")
  .appendChild(video);

}

document.getElementById("send").onclick = () => {

  var msg = document.getElementById("msg").value;

  socket.emit("chat", msg);

  document.getElementById("msg").value = "";

};

socket.on("chat", data => {

  var div = document.createElement("div");

  if(data.system) {
    div.innerText = data.message;
  } else {
    div.innerText =
      `${data.name}: ${data.message}`;
  }

  messages.appendChild(div);

});

document.getElementById("mute").onclick = () => {

  localStream.getAudioTracks()[0].enabled =
  !localStream.getAudioTracks()[0].enabled;

};

document.getElementById("camera").onclick = () => {

  localStream.getVideoTracks()[0].enabled =
  !localStream.getVideoTracks()[0].enabled;

};

document.getElementById("share").onclick = async () => {

  var stream =
  await navigator.mediaDevices.getDisplayMedia({
    video:true
  });

  var track = stream.getVideoTracks()[0];

  Object.values(peers).forEach(peer => {

    var sender =
    peer.getSenders().find(s =>
      s.track.kind === "video"
    );

    sender.replaceTrack(track);

  });

};
