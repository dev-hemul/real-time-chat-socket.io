import { io } from "socket.io-client";

const URL = import.meta.env.MODE === 'production'
  ? window.location.origin  // например, http://143.244.160.141
  : "http://localhost:3000";

export const socket = io(URL, {
  autoConnect: false,
});