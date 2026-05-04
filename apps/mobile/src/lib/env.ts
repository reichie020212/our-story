import { Platform } from "react-native";

// EXPO_PUBLIC_* env vars are inlined at build time by Expo's
// bundler — no runtime config plumbing needed. Set
// EXPO_PUBLIC_API_BASE_URL in your shell or apps/mobile/.env when
// pointing at a non-default backend (e.g. a deployed Vercel URL,
// or a LAN IP for testing on a physical device).
//
// Platform-aware fallback for dev:
//   • iOS simulator shares the host's network → localhost works.
//   • Android emulator routes the host as 10.0.2.2.
//   • Physical devices need EXPO_PUBLIC_API_BASE_URL=http://<lan-ip>:3000.

const FALLBACK = Platform.select({
  ios: "http://localhost:3000",
  android: "http://10.0.2.2:3000",
  default: "http://localhost:3000",
});

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? FALLBACK ?? "http://localhost:3000";
