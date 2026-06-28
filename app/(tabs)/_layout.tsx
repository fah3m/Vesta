import { Tabs, router } from "expo-router";
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS, TAB_BAR_HEIGHT } from "@/constants/theme";

function SOSButton() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.18,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.fabWrapper}>
      <Animated.View
        style={[styles.pulseRing, { transform: [{ scale: pulse }] }]}
        pointerEvents="none"
      />
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push("/sos")}
        activeOpacity={0.85}
        accessibilityLabel="Trigger emergency SOS"
        accessibilityRole="button"
      >
        <Ionicons name="shield" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/login");
    }
  }, [user, isLoading]);

  if (!user) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.white,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: "Check-in",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "timer" : "timer-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sos-placeholder"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: () => <SOSButton />,
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: "Circle",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: TAB_BAR_HEIGHT,
    paddingBottom: 12,
    paddingTop: 10,
    elevation: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  fabWrapper: {
    position: "relative",
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    top: -28,
  },
  pulseRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: COLORS.sosRing,
    opacity: 0.55,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.sos,
    alignItems: "center",
    justifyContent: "center",
  },
});