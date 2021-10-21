import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  forceNew: true,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
});

export default socket;
