/**
 * Refresh token at rest = OS keychain (iOS) / Keystore (Android).
 * Never write the access token to storage — it's short-lived (15min),
 * so an in-memory copy is enough.
 *
 * On web (rare for this app, but Expo can target it), expo-secure-store
 * is unavailable. We fall back to an in-memory map so the auth flow
 * still works during local web development.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const REFRESH_KEY = "ourstory.refreshToken";

const memoryFallback = new Map<string, string>();

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    memoryFallback.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return memoryFallback.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    memoryFallback.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveRefreshToken(token: string): Promise<void> {
  await setItem(REFRESH_KEY, token);
}

export async function loadRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_KEY);
}

export async function clearRefreshToken(): Promise<void> {
  await deleteItem(REFRESH_KEY);
}
