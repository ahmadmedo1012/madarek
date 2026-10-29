import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Platform-honest token storage:
 * - Native: expo-secure-store (Keychain / Keystore) — secrets never touch
 *   plain storage.
 * - Web: localStorage via AsyncStorage — mirroring the web app's own
 *   security model (the browser frontend keeps its access token in
 *   localStorage; there is no platform keychain on static web builds).
 */
export async function setToken(key: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (value) await AsyncStorage.setItem(key, value);
      else await AsyncStorage.removeItem(key);
      return;
    }
    if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // Storage failures must never break the session flow.
  }
}

export async function getToken(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return (await AsyncStorage.getItem(key)) ?? null;
    }
    return (await SecureStore.getItemAsync(key)) ?? null;
  } catch {
    return null;
  }
}
