import { View, Text, StyleSheet } from "react-native";

export default function MessageBubble({ text, outgoing, status }: any) {
  return (
    <View style={[styles.bubble, outgoing ? styles.outgoing : styles.incoming]}>
      <Text style={styles.text}>{text}</Text>
      {status && <Text style={styles.status}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 12,
    maxWidth: "75%",
  },
  outgoing: {
    alignSelf: "flex-end",
    backgroundColor: "#cce5ff",
  },
  incoming: {
    alignSelf: "flex-start",
    backgroundColor: "#e0e0e0",
  },
  text: { fontSize: 15 },
  status: { fontSize: 10, color: "#555", textAlign: "right" },
});
