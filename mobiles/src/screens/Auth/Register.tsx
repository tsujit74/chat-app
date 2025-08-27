// src/screens/Auth/Register.tsx
import React, { useState } from "react";
import { View, TextInput, Button, Alert, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../../api/api"; // your axios instance
import { useAuth } from "../../contexts/AuthContext";

export default function Register() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Frontend validation
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    setLoading(true);

    try {
      // Register API call
      const res = await api.post("/auth/register", { username, email, password });

      // Successful registration
      Alert.alert("Success", `Welcome ${res.data.user.username}!`);

      // Auto-login after registration
      try {
        await login(email, password);
        // If login is successful, navigation is handled inside login
      } catch (loginErr: any) {
        console.error("Auto login failed:", loginErr.response?.data || loginErr.message);
        Alert.alert(
          "Info",
          "Registration successful, but auto-login failed. Please login manually."
        );
        navigation.navigate("Login");
      }
    } catch (err: any) {
      // Handle API errors
      const msg =
        err.response?.data?.msg ||
        err.response?.data?.error ||
        err.message ||
        "Registration failed. Please try again.";
      Alert.alert("Error", msg);
      console.error("Registration error:", err.response || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Register</Text>

      <TextInput
        placeholder="Name"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="words"
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 10 }} />
      ) : (
        <Button title="Register" onPress={handleRegister} />
      )}

      <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
        Already have an account? Login
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 10, marginBottom: 15 },
  link: { marginTop: 15, color: "blue", textAlign: "center" },
});
