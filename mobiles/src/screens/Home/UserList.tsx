import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/api";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";

export default function UsersList({ navigation }: any) {
  const { user, token, logout } = useAuth();
  const { socket } = useSocket();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token || !user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mappedUsers = res.data.map((u: any) => ({ ...u, online: false }));
      setUsers(mappedUsers);
    } catch (err: any) {
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [fetchUsers])
  );

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      setUsers((prev) =>
        prev.map((u) =>
          u._id === msg.sender || u._id === msg.receiverId
            ? { ...u, lastMessage: msg }
            : u
        )
      );
    };

    const handleDelivered = ({ messageId }: any) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.lastMessage?._id === messageId
            ? { ...u, lastMessage: { ...u.lastMessage, delivered: true } }
            : u
        )
      );
    };

    const handleRead = ({ messageId }: any) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.lastMessage?._id === messageId
            ? { ...u, lastMessage: { ...u.lastMessage, read: true } }
            : u
        )
      );
    };

    const handleStatus = ({ userId, online }: any) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, online } : u))
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:delivered", handleDelivered);
    socket.on("message:read", handleRead);
    socket.on("user:status", handleStatus);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:delivered", handleDelivered);
      socket.off("message:read", handleRead);
      socket.off("user:status", handleStatus);
    };
  }, [socket]);

  const openChat = async (other: any) => {
    try {
      const res = await api.post(
        "/conversations/conversation",
        { senderId: user._id, receiverId: other._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigation.navigate("Chat", { conversationId: res.data._id, other });
    } catch {
      Alert.alert("Error", "Unable to start chat.");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => await logout(),
      },
    ]);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading users...</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Users</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      {users.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No other users found.
        </Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openChat(item)}
              style={styles.userRow}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.username?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                {/* Username + Online dot */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={styles.username}>
                    {item.username || item.email}
                  </Text>
                  <View
                    style={[
                      styles.onlineDot,
                      { backgroundColor: item.online ? "green" : "gray" },
                    ]}
                  />
                </View>

                {/* Last message */}
                {item.lastMessage && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <Text
                      style={styles.lastMessage}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      <Text style={{ color: "indigo" }}>
                        {item.lastMessage.read
                          ? "✓✓ "
                          : item.lastMessage.delivered
                          ? "✓ "
                          : ""}
                      </Text>
                      {item.lastMessage.sender === user._id ? "You: " : ""}
                      {item.lastMessage.text}
                    </Text>

                    <Text style={styles.timestamp}>
                      {item.lastMessage.updatedAt
                        ? new Date(
                            item.lastMessage.updatedAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : new Date(
                            item.lastMessage.createdAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700" },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
  },
  logoutText: { color: "#fff", fontWeight: "600" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  username: { fontSize: 16, fontWeight: "600" },
  status: { fontSize: 13, color: "#666", marginTop: 2 },
  lastMessage: { fontSize: 13, color: "#888", marginTop: 2 },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    minWidth: 50,
    textAlign: "right",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor:"red"
  },
});
