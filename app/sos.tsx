import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/hooks/useLocation";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export default function SOSScreen() {
  const { sessionToken } = useAuth();
  const { requestLocationForCheckIn, isFetching: locating } = useLocation();
  const triggerManual = useMutation(api.sos.triggerManual);
  const [triggered, setTriggered] = useState(false);
  const [loading, setLoading] = useState(false);

 const handleSOS = async () => {
  Alert.alert(
    "Send SOS Alert?",
    "This will alert all your trusted contacts immediately.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send SOS",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const locResult = await requestLocationForCheckIn();

            if (!locResult) {
              // Location services off or permission denied — the
              // relevant alert was already shown inside
              // requestLocationForCheckIn. Do NOT send SOS without
              // location; let the person resolve it and try again.
              return;
            }

            const quick = locResult.quick;

            await triggerManual({
              sessionToken: sessionToken!,
              latitude: quick?.latitude,
              longitude: quick?.longitude,
            });
            setTriggered(true);
          } catch (err: any) {
            Alert.alert("Error", err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]
  );
};

  // Only reflects the button's own loading state now — `locating` from the
  // hook stays true through the background `refined` fetch, which SOS
  // doesn't wait on, so it shouldn't hold the button in a spinning state.
  const busy = loading;

  if (triggered) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmedBox}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          <Text style={styles.confirmedTitle}>SOS Sent</Text>
          <Text style={styles.confirmedSub}>
            Your trusted contacts have been alerted with your location.
          </Text>
        </View>
        <TouchableOpacity style={styles.dismissButton} onPress={() => router.back()}>
          <Text style={styles.dismissText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color={COLORS.muted} />
      </TouchableOpacity>

      <View style={styles.inner}>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.subtitle}>
          Pressing SOS will immediately alert all your trusted contacts with your current location.
        </Text>

        <View style={styles.locationRow}>
          <Ionicons
            name={locating ? "location" : "location-outline"}
            size={16}
            color={locating ? COLORS.success : COLORS.muted}
          />
          <Text style={[styles.locationText, { color: locating ? COLORS.success : COLORS.muted }]}>
            {locating ? "Getting your location..." : "Location is requested when you press SOS"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.sosButton, busy && { opacity: 0.6 }]}
          onPress={handleSOS}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.white} size="large" />
          ) : (
            <>
              <Ionicons name="shield" size={32} color={COLORS.white} />
              <Text style={styles.sosButtonText}>SEND SOS</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>Hold to confirm in the dialog</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  closeButton: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#F0F0F0",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "500",
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.sos,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    shadowColor: COLORS.sos,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  sosButtonText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
  },
  hint: { color: "#444", fontSize: 13 },
  confirmedBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  confirmedTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.success,
  },
  confirmedSub: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  dismissButton: {
    margin: 32,
    padding: 16,
    backgroundColor: "#161616",
    borderRadius: 12,
    alignItems: "center",
  },
  dismissText: { color: "#F0F0F0", fontWeight: "600", fontSize: 16 },
});