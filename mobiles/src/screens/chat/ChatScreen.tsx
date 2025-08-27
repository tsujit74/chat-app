import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import api from "../../api/api";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import MessageBubble from "../../components/MessageBubble";

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, other } = route.params;
  const { socket } = useSocket();
  const { user } = useAuth();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean | string>(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch online/offline status on mount
  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const res = await api.get(`/users/${other._id}/status`);
        setIsOnline(
          res.data.online
            ? true
            : res.data.lastSeen
            ? new Date(res.data.lastSeen).toLocaleTimeString()
            : "Offline"
        );
      } catch (err) {
        console.log(" Error fetching user status:", err);
      }
    };
    fetchUserStatus();
  }, [other._id]);

  // Update header with online/offline
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>
            {other.username || "Chat"}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: isOnline === true ? "green" : "gray",
            }}
          >
            {isOnline === true
              ? "Online"
              : typeof isOnline === "string"
              ? `Last seen at ${isOnline}`
              : "Offline"}
          </Text>
        </View>
      ),
    });
  }, [navigation, isOnline, other.username]);

  // Load message history
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/conversations/${conversationId}/messages`);
        setMessages(res.data);
      } catch (err) {
        console.log(" Error loading history:", err);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    })();
  }, [conversationId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onNew = (msg: any) => {
      if (msg.conversationId !== conversationId) return;

      setMessages((prev) => {
        const index = prev.findIndex(
          (m) =>
            m._id.startsWith("local-") &&
            m.text === msg.text &&
            m.sender === msg.sender
        );
        if (index !== -1) {
          const newMessages = [...prev];
          newMessages[index] = msg;
          return newMessages;
        }
        return [...prev, msg];
      });

      scrollToBottom();
    };

    const onRead = ({ messageId }: any) =>
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, read: true } : m))
      );

    const onDelivered = ({ messageId }: any) =>
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId && !m.read ? { ...m, delivered: true } : m
        )
      );

    const onUserStatus = ({ userId, online, lastSeen }: any) => {
      if (userId === other._id) {
        setIsOnline(
          online
            ? true
            : lastSeen
            ? new Date(lastSeen).toLocaleTimeString()
            : "Offline"
        );
      }
    };

    let typingStopTimer: NodeJS.Timeout | null = null;
    const onTypingStart = ({ conversationId: cId, userId }: any) => {
      if (cId === conversationId && userId === other._id) {
        setTyping(true);
        if (typingStopTimer) clearTimeout(typingStopTimer);
        typingStopTimer = setTimeout(() => setTyping(false), 2000);
      }
    };

    const onTypingStop = ({ conversationId: cId, userId }: any) => {
      if (cId === conversationId && userId === other._id) setTyping(false);
    };

    socket.on("message:new", onNew);
    socket.on("message:read", onRead);
    socket.on("message:delivered", onDelivered);
    socket.on("user:status", onUserStatus);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:read", onRead);
      socket.off("message:delivered", onDelivered);
      socket.off("user:status", onUserStatus);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
    };
  }, [socket, conversationId, other._id]);

  // Send message
  const handleSend = () => {
    if (!text.trim() || !socket) return;

    const payload = {
      conversationId,
      senderId: user._id,
      receiverId: other._id,
      text: text.trim(),
    };
    socket.emit("message:send", payload);

    setMessages((prev) => [
      ...prev,
      {
        _id: `local-${Date.now()}`,
        conversationId,
        sender: user._id,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        delivered: false,
        read: false,
      },
    ]);

    setText("");
    scrollToBottom();
  };

  // Typing handler
  const handleTyping = (value: string) => {
    setText(value);
    if (!socket) return;

    if (!typingTimeout.current) {
      socket.emit("typing:start", {
        conversationId,
        userId: user._id,
        receiverId: other._id,
      });
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", {
        conversationId,
        userId: user._id,
        receiverId: other._id,
      });
      typingTimeout.current = null;
    }, 1500);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleViewableItemsChanged = useRef(({ changed }: any) => {
    changed.forEach((item: any) => {
      if (item.isViewable && item.item.sender !== user._id && !item.item.read) {
        socket?.emit("message:read", {
          messageId: item.item._id,
          userId: user._id,
        });
      }
    });
  }).current;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9f9f9" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <FlatList
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m._id}
          renderItem={({ item }) => (
            <MessageBubble
              text={item.text}
              outgoing={item.sender === user._id}
              status={item.read ? "✓✓" : item.delivered ? "✓" : ""}
            />
          )}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          onContentSizeChange={scrollToBottom}
        />

        {typing && (
          <Text style={styles.typingOther}>
            {other.username || "User"} is typing…
          </Text>
        )}

        <View style={styles.inputRow}>
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              style={styles.input}
              multiline
              textAlignVertical="top"
              returnKeyType="default"
            />
            <Button title="Send" onPress={handleSend} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  inputRow: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 20,
    maxHeight: 120,
    marginRight: 8,
  },

  typingOther: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontStyle: "italic",
    color: "#555",
    backgroundColor: "#e0e0e0",
    borderRadius: 12,
    alignSelf: "flex-start",
    marginLeft: 12,
    marginBottom: 4,
  },
});
