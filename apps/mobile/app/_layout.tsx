import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  useFonts as useFraunces,
} from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

import { AuthProvider, useAuth } from "@/src/context/auth";
import { queryClient } from "@/src/lib/query-client";
import { colors } from "@/src/theme/tokens";

// Keep the splash visible until both fonts and auth boot are ready.
// SplashScreen.hideAsync() fires once we're done in <RootGate />.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden — fine */
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFraunces({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    // Splash still showing; render nothing.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootGate />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Hides the splash once auth has settled, then renders the Stack
 *  whose screens are gated by the (auth) vs (tabs) group. The auth
 *  context exposes a `loading` status during the boot refresh; we
 *  hold the splash until that resolves so the user never sees a
 *  flash of the sign-in screen before silently signing in. */
function RootGate() {
  const { state } = useAuth();

  useEffect(() => {
    if (state.status !== "loading") {
      SplashScreen.hideAsync().catch(() => {
        /* already hidden — fine */
      });
    }
  }, [state.status]);

  if (state.status === "loading") return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
