import { useState, useCallback } from "react";
import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";

type LatLng = { latitude: number; longitude: number };

type CheckInLocationResult = {
  quick: LatLng | null;
  refined: Promise<LatLng | null>;
};

export function useLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  const promptEnableServices = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      Alert.alert(
        "Turn On Location",
        "Location services are off. Please enable them to check in.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve() },
          { text: "Open Settings", onPress: () => { openSettings(); resolve(); } },
        ],
        { cancelable: true, onDismiss: () => resolve() }
      );
    });
  }, []);

  const promptPermissionDenied = useCallback(() => {
    Alert.alert(
      "Location Permission Needed",
      "We need access to your location to complete check-in. Please enable it in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: openSettings },
      ]
    );
  }, []);

  const requestLocationForCheckIn = useCallback(async (): Promise<CheckInLocationResult | null> => {
    setIsFetching(true);
    try {
      // 1. System-level location services
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        await promptEnableServices();
        setIsFetching(false);
        return null;
      }

      // 2. Foreground permission
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        promptPermissionDenied();
        setIsFetching(false);
        return null;
      }

      // 3. Fast path: cached fix, if recent enough. Resolves near-instantly.
      let quick: LatLng | null = null;
      try {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (last) {
          quick = { latitude: last.coords.latitude, longitude: last.coords.longitude };
          setLocation(quick);
        }
      } catch {
        // No cache available — fall through, refined fetch below still runs.
      }

      // don't have to block on it. isFetching stays true until this settles.
      const refined = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then((fresh) => {
          const coords = {
            latitude: fresh.coords.latitude,
            longitude: fresh.coords.longitude,
          };
          setLocation(coords);
          return coords;
        })
        .catch(() => null)
        .finally(() => setIsFetching(false));

      return { quick, refined };
    } catch {
      Alert.alert("Couldn't Get Location", "We weren't able to determine your location. Please try again.");
      setIsFetching(false);
      return null;
    }
  }, [promptEnableServices, promptPermissionDenied]);

  return { location, isFetching, requestLocationForCheckIn };
}