// mobile/src/api/api.ts
import axios, { AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";


// Create axios instance
const api = axios.create({
  baseURL: `https://chat-app-76vg.onrender.com/api`,
  timeout: 10000, // 10 seconds
});

// Request interceptor: attach token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Error reading token:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Check network connection
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert("Network Error", "No internet connection. Please check your network.");
      return Promise.reject({ message: "No internet connection" });
    }

    // Timeout
    if (error.code === "ECONNABORTED") {
      Alert.alert("Timeout", "Server took too long to respond. Please try again.");
      return Promise.reject({ message: "Request timeout" });
    }

    // Unauthorized / token expired
    if (error.response?.status === 401) {
      Alert.alert("Session Expired", "Please login again.");
      await AsyncStorage.removeItem("token");
      // Optional: trigger logout or navigation to login
      return Promise.reject({ message: "Unauthorized" });
    }

    // Forbidden
    if (error.response?.status === 403) {
      Alert.alert("Forbidden", "You do not have permission to perform this action.");
      return Promise.reject({ message: "Forbidden" });
    }

    // 404 Not Found
    if (error.response?.status === 404) {
      Alert.alert("Not Found", "Requested resource not found.");
      return Promise.reject({ message: "Not Found" });
    }

    // Default server error
    const msg = error.response?.data?.msg || error.message || "Something went wrong";
    Alert.alert("Error", msg);

    return Promise.reject(error);
  }
);

export default api;
