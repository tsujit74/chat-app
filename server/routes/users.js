// routes/users.js
import express from "express";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();


router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select("-password");

    const usersWithLastMessageAndStatus = await Promise.all(
      users.map(async (u) => {
       
        const convo = await Conversation.findOne({
          members: { $all: [req.userId, u._id] },
        });

        let lastMsg = null;
        if (convo) {
          lastMsg = await Message.findOne({ conversationId: convo._id })
            .sort({ createdAt: -1 })
            .lean();
        }

        return {
          _id: u._id,
          username: u.username,
          email: u.email,
          online: u.online || false,
          lastSeen: u.lastSeen || null,
          lastMessage: lastMsg || null,
        };
      })
    );

    res.json(usersWithLastMessageAndStatus);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/status", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("username online lastSeen");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      _id: user._id,
      username: user.username,
      online: user.online || false,
      lastSeen: user.lastSeen || null,
    });
  } catch (err) {
    console.error("Error fetching user status:", err);
    res.status(500).json({ error: err.message });
  }
});


export default router;
