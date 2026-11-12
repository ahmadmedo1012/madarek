/**
 * R326 M1.3(e) — RTL direction, applied safely. (r349-P4: the reload
 * is RETIRED — see the history below.)
 *
 * `I18nManager.forceRTL(true)` at module scope only takes effect on the
 * NEXT native launch. Historically a fresh install therefore ran LTR
 * while the JS tree rendered RTL-authored layouts → mirrored screens,
 * and the old cure was ONE controlled `Updates.reloadAsync()` — until
 * the CI smoke proved that cure worse than the disease: reloading the
 * React context mid-boot left the reloaded tree with a DEAD render
 * pipeline (the view hierarchy mounted — dumpsys showed the welcome
 * screen complete with its SVG grid — while zero frames ever painted;
 * "Tried to enqueue runnable on already finished thread: v_native",
 * every view flagged never-drawn) → the bare-paper first launch that
 * failed the smoke on every anchor generation.
 *
 * The direction is now baked NATIVELY before the first React root
 * (plugins/force-rtl-android.js — I18nUtil.allowRTL/forceRTL from
 * MainApplication.onCreate), so `I18nManager.isRTL` reads TRUE on the
 * very first boot and this module's job is only to record that the
 * native bake is in effect. The exotic fallback (a prebuild-less local
 * run where the bake is missing) renders LTR rather than reloading —
 * the direction then applies on the next natural launch. NEVER reload
 * mid-boot again.
 */
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "mdrk.rtl.applied.v1";

/**
 * Returns true when a reload was requested (legacy contract — always
 * FALSE now; kept so the caller's splash-guard branch stays honest).
 */
export async function ensureRTL(): Promise<boolean> {
  try {
    if (I18nManager.isRTL) {
      await AsyncStorage.setItem(KEY, "1").catch(() => undefined);
      return false;
    }
    // The native bake didn't reach this process (exotic local run).
    // Render anyway — the direction applies on the next natural
    // launch; a mid-boot reload is never worth a dead pipeline.
    await AsyncStorage.setItem(KEY, "0").catch(() => undefined);
    return false;
  } catch {
    return false;
  }
}
