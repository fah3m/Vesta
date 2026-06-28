import { Redirect } from "expo-router";
import { useConvexAuth } from "convex/react";
import { View, Text } from "react-native";

export default function Index() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  console.log("Auth state:", { isAuthenticated, isLoading });

  if (isLoading) return <View><Text style={{color:"white"}}>Loading...</Text></View>;

  return isAuthenticated
    ? <Redirect href="/(tabs)/home" />
    : <Redirect href="/auth/login" />;
}