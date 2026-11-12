/**
 * force-rtl-android — r349-P4: bake the RTL direction NATIVELY, before
 * the first React root view exists.
 *
 * THE BUG THIS RETIRES (the CI smoke's 13-run bare-paper mystery):
 * the app is Arabic-first; `I18nManager.forceRTL(true)` from JS only
 * applies the native direction on the NEXT root. The old fix
 * (src/lib/rtl.ts, R326 M1.3(e)) did ONE controlled
 * `Updates.reloadAsync()` on first-ever launch — but reloading the
 * React context mid-boot leaves the reloaded context with a DEAD
 * render pipeline: the view tree mounts (dumpsys showed the welcome
 * screen's full hierarchy — the SVG grid included) while ZERO frames
 * ever paint ("Tried to enqueue runnable on already finished thread:
 * v_native", every view flagged never-drawn) → the bare paper screen
 * Maestro stared at for 120s, on every anchor generation (Arabic text
 * ×2, then the id-first testIDs — the anchors were never the problem).
 *
 * THE FIX: call I18nUtil from MainApplication.onCreate — before any
 * React root is created — so `I18nManager.isRTL` reads TRUE on the
 * very first JS boot, the first view hierarchy lays out RTL, and the
 * controlled reload (with its dead-pipeline class) never needs to
 * fire at all. Real devices get the same guarantee: a correct,
 * un-reloaded first launch.
 *
 * iOS needs no plugin twin: SupportsRTL + CFBundleDevelopmentRegion=ar
 * (app.config.ts) already land RTL on the first simulator/device boot
 * (the iOS smoke reached login every time).
 */
const { withMainApplication } = require("@expo/config-plugins");

const IMPORT = "import com.facebook.react.modules.i18nmanager.I18nUtil";
const CALLS = [
  "    // r349-P4: RTL baked before the first React root — the JS-side",
  "    // controlled reload (src/lib/rtl.ts) is retired: it left the",
  "    // reloaded context with a dead render pipeline (views mounted,",
  "    // zero frames painted — the smoke's bare-paper screen).",
  "    I18nUtil.getInstance().allowRTL(this, true)",
  "    I18nUtil.getInstance().forceRTL(this, true)",
].join("\n");

module.exports = function forceRtlAndroid(config) {
  return withMainApplication(config, (cfg) => {
    const mod = cfg.modResults;
    if (mod.language !== "kt") {
      throw new Error(
        "force-rtl-android: MainApplication is not Kotlin — the template changed; update the plugin anchors.",
      );
    }
    if (mod.contents.includes("I18nUtil")) return cfg; // idempotent

    // 1) the import — anchored on the package line (always first).
    let contents = mod.contents.replace(
      /^(package [\w.]+)$/m,
      `$1\n\n${IMPORT}`,
    );
    if (!contents.includes(IMPORT)) {
      throw new Error("force-rtl-android: could not add the I18nUtil import (package anchor missing).");
    }

    // 2) the bake — right after super.onCreate() in onCreate().
    if (!/super\.onCreate\(\)/.test(contents)) {
      throw new Error("force-rtl-android: super.onCreate() anchor missing from MainApplication.onCreate.");
    }
    contents = contents.replace(
      /(super\.onCreate\(\))/,
      `$1\n${CALLS}`,
    );

    // 3) prove both markers landed — never patch silently half-way.
    if (!contents.includes("I18nUtil.getInstance().forceRTL(this, true)")) {
      throw new Error("force-rtl-android: the forceRTL call did not land.");
    }
    mod.contents = contents;
    return cfg;
  });
};
