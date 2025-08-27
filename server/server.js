import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import { authMiddleware } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import conversationRoutes from "./routes/conversations.js";

import Message from "./models/Message.js";
import User from "./models/User.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
  },
  transports: ["websocket", "polling"],
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/conversations", authMiddleware, conversationRoutes);

// Online users map (userId -> Set of socketIds)
const onlineUsers = new Map();

const setUserOnline = async (userId, socketId) => {
  const sockets = onlineUsers.get(userId) || new Set();
  sockets.add(socketId);
  onlineUsers.set(userId, sockets);

  await User.findByIdAndUpdate(userId, { online: true });
  io.emit("user:status", { userId, online: true });
};

const setUserOffline = async (userId, socketId) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
    io.emit("user:status", { userId, online: false, lastSeen: new Date() });
  } else {
    onlineUsers.set(userId, sockets);
  }
};

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // User comes online
  socket.on("user:online", async (userId) => {
    if (!userId) return;
    await setUserOnline(userId, socket.id);
  });

  // Send message
  socket.on("message:send", async (data) => {
    try {
      const savedMessage = await Message.create({
        conversationId: data.conversationId,
        sender: data.senderId,
        text: data.text,
      });

      socket.emit("message:new", savedMessage);

      // Emit to receiver if online
      const receiverSockets = onlineUsers.get(data.receiverId);
      if (receiverSockets) {
        receiverSockets.forEach((sId) => io.to(sId).emit("message:new", savedMessage));
      }
    } catch (err) {
      console.error("message:send error:", err);
    }
  });

  // Typing events
  socket.on("typing:start", ({ conversationId, userId, receiverId }) => {
    const receiverSockets = onlineUsers.get(receiverId);
    if (receiverSockets) {
      receiverSockets.forEach((sId) => io.to(sId).emit("typing:start", { conversationId, userId }));
    }
  });

  socket.on("typing:stop", ({ conversationId, userId, receiverId }) => {
    const receiverSockets = onlineUsers.get(receiverId);
    if (receiverSockets) {
      receiverSockets.forEach((sId) => io.to(sId).emit("typing:stop", { conversationId, userId }));
    }
  });

  // Read receipts
  socket.on("message:read", async ({ messageId, userId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { read: true });
      io.emit("message:read", { messageId, userId });
    } catch (err) {
      console.error("message:read error:", err);
    }
  });

  // Delivered receipts
  socket.on("message:delivered", async ({ messageId, userId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { delivered: true });
      io.emit("message:delivered", { messageId, userId });
    } catch (err) {
      console.error("message:delivered error:", err);
    }
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    console.log("Socket disconnected:", socket.id);
    for (const [userId, sockets] of onlineUsers.entries()) {
      if (sockets.has(socket.id)) {
        await setUserOffline(userId, socket.id);
        break;
      }
    }
  });
});

// Connect to DB + start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
