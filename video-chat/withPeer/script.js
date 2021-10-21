const Peer = window.Peer;

const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {
  host: "/",
  port: "3001",
});
const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    console.log(1);
    addVideoStream(myVideo, stream);
    console.log(2);

    // myPeer.on("call", (call) => {
    //   call.answer(stream);
    //   const video = document.createElement("video");
    //   call.on("stream", (userVideoStream) => {
    //     addVideoStream(video, userVideoStream);
    //   });
    // });

    socket.on("user-connected", (userId) => {
      console.log("user connected " + userId);
      console.log(3);
      connectToNewUser(userId, stream);
    });
  });

socket.on("user-disconnected", (userId) => {
  console.log("user disconnected " + userId);
  if (peers[userId]) peers[userId].close();
});

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
  console.log(4);
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  video.style.border = "2px solid red";

  call.answer(stream);

  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((userVideoStream) => {
      addVideoStream(video, userVideoStream);
    });

  call.on("stream", (stream) => {
    addVideoStream(video, stream);
  });

  call.on("close", () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  console.log(stream);
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}
