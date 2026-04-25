import "dotenv/config";
import express from "express";
import http from "http";
import {Server} from "socket.io";
import mongoose from "mongoose";
import {Message} from "./models/Message.js";

await mongoose.connect(process.env.MONGO_URI);

console.log("🟢 MongoDB connected");

const app = express();
const server = http.createServer(app);

// подключаем Socket.IO к HTTP серверу
const io = new Server(server, {
  cors: {
    origin: "*" // потом ограничим
  }
});

// базовый endpoint (не обязателен, но удобно проверить)
app.get("/", (req, res) => {
  res.send("Server is running");
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Присоединится к комнтае
  socket.on("join:room", async (room) => {
    socket.join(room);

    const history = await Message.find({room})
      .sort({createdAt: 1})
      .limit(50);

    socket.emit("chat:history", history);
  });

  socket.on("chat:message", async (data) => {
    const message = await Message.create({
      text: data.text,
      user: data.user,
      room: data.room,
      createdAt: new Date()
    });

    io.to(data.room).emit("chat:message", message);
  });

  socket.on("leave:room", (room) => {
    socket.leave(room);
    console.log(`👋 left room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 disconnected:", socket.id);
  });

  socket.on("typing:start", ({room, user}) => {
    console.log(`📝 typing:start in ${room} from ${user}`);
    socket.to(room).emit("typing:update", {user, isTyping: true});
  });

  socket.on("typing:stop", ({room, user}) => {
    console.log(`✋ typing:stop in ${room} from ${user}`);
    socket.to(room).emit("typing:update", {user, isTyping: false});
  });

  socket.on("chat:clear", async ({ room }) => {
  await Message.deleteMany({ room });
  io.to(room).emit("chat:cleared");
});

});


const PORT = 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});