import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

import { authMiddleware } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import conversationRoutes from "./routes/conversations.js";

import Message from "./models/Message.js";
import User from "./models/User.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ------------------- MIDDLEWARE -------------------

// Security headers
app.use(helmet());

// Logging
app.use(morgan("combined"));

// Parse JSON requests
app.use(express.json());

// CORS – restrict origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);

// ------------------- ROUTES -------------------

app.use("/api/auth", authRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/conversations", authMiddleware, conversationRoutes);

// ------------------- SOCKET.IO -------------------

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
  },
  transports: ["websocket", "polling"],
});

// Online users map
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
    const lastSeen = new Date();
    await User.findByIdAndUpdate(userId, { online: false, lastSeen });
    io.emit("user:status", { userId, online: false, lastSeen });
  } else {
    onlineUsers.set(userId, sockets);
  }
};

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("user:online", async (userId) => {
    if (!userId) return;
    await setUserOnline(userId, socket.id);
  });

  socket.on("message:send", async (data) => {
    try {
      const savedMessage = await Message.create({
        conversationId: data.conversationId,
        sender: data.senderId,
        text: data.text,
      });

      socket.emit("message:new", savedMessage);

      const receiverSockets = onlineUsers.get(data.receiverId);
      if (receiverSockets) {
        receiverSockets.forEach((sId) => io.to(sId).emit("message:new", savedMessage));
      }
    } catch (err) {
      console.error("message:send error:", err);
    }
  });

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

  socket.on("message:read", async ({ messageId, userId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { read: true });
      io.emit("message:read", { messageId, userId });
    } catch (err) {
      console.error("message:read error:", err);
    }
  });

  socket.on("message:delivered", async ({ messageId, userId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { delivered: true });
      io.emit("message:delivered", { messageId, userId });
    } catch (err) {
      console.error("message:delivered error:", err);
    }
  });

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

// ------------------- DATABASE & SERVER -------------------

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

startServer();
