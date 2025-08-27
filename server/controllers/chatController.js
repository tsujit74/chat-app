import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

// GET /conversations/:id/messages
export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /conversations/conversation 
export const createOrGetConversation = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId], $size: 2 }
    });

    if (!conversation) {
      conversation = await Conversation.create({ members: [senderId, receiverId] });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /conversations/:id/messages
export const sendMessage = async (req, res) => {
  try {
    const { sender, text } = req.body;
    const { id: conversationId } = req.params;

    const message = await Message.create({
      conversationId,
      sender,
      text
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
