import express from "express";
import { createOrGetConversation, getMessages, sendMessage } from "../controllers/chatController.js";

const router = express.Router();
router.post("/conversation", createOrGetConversation);
router.get("/:id/messages", getMessages);
router.post("/:id/messages", sendMessage);

export default router;
