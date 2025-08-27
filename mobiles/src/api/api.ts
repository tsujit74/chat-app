// mobile/src/api/api.ts
import axios, { AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export const SERVER_BASE = "http://10.232.171.17:8000";

const api = axios.create({
  baseURL: `${SERVER_BASE}/api`,
  timeout: 10000, // 10 seconds
});

// Request interceptor to attach token
api.interceptors.request.use(
  async (cfg) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        cfg.headers = cfg.headers ?? {};
        cfg.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Error reading token:", e);
    }
    return cfg;
  },
  (err) => Promise.reject(err)
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    // Check network connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Alert.alert("Network Error", "No internet connection. Please check your network.");
      return Promise.reject({ message: "No internet connection" });
    }

    if (err.code === "ECONNABORTED") {
      Alert.alert("Timeout", "Server took too long to respond. Please try again.");
      return Promise.reject({ message: "Request timeout" });
    }

    // Unauthorized / Token expired
    if (err.response?.status === 401) {
      Alert.alert("Unauthorized", "Session expired. Please login again.");
      await AsyncStorage.removeItem("token");
      // Optional: navigate to login screen
      return Promise.reject({ message: "Unauthorized" });
    }

    // Forbidden
    if (err.response?.status === 403) {
      Alert.alert("Forbidden", "You do not have permission to perform this action.");
      return Promise.reject({ message: "Forbidden" });
    }

    // Default server error
    const msg = err.response?.data?.msg || err.message || "Something went wrong";
    Alert.alert("Error", msg);

    return Promise.reject(err);
  }
);

export default api;
