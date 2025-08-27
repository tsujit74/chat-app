import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { AuthProvider } from "./src/contexts/AuthContext";
import { SocketProvider } from "./src/contexts/SocketContext";
import AppNavigator from "./src/navigation/AppNavigator";

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NavigationContainer>
          <Drawer.Navigator screenOptions={{ headerShown: false }}>
            <Drawer.Screen name="AppNavigator" component={AppNavigator} />
          </Drawer.Navigator>
        </NavigationContainer>
      </SocketProvider>
    </AuthProvider>
  );
}
