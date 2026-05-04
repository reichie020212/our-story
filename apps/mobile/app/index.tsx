import { Redirect } from "expo-router";
import { useAuth } from "@/src/context/auth";

/** The root route is a thin redirect: once auth state has settled,
 *  send signed-out users to /(auth)/sign-in and signed-in users to
 *  /(tabs)/browse. The splash holds during the initial load so this
 *  component renders for one frame at most. */
export default function Index() {
  const { state } = useAuth();
  if (state.status === "loading") return null;
  return (
    <Redirect
      href={state.status === "signed-in" ? "/(tabs)/browse" : "/(auth)/sign-in"}
    />
  );
}
