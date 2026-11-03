/**
 * features/ai/clipboard — text copy without a new dependency (R334 3-f).
 *
 * RN 0.88's TS types no longer export the (deprecated-but-present) core
 * Clipboard, and the mission allows no new deps — so the copy affordance
 * reads it through a typed `require` (the same escape hatch ui/sheet.tsx
 * uses for the lazy native graph) and falls back to the system share
 * sheet when the API is unavailable (older web runtimes, future RN
 * removals). Never throws.
 */

import { Share } from "react-native";
import { toast } from "@/components/ui/toast";

/** RN core Clipboard — deprecated since 0.59, still shipped in 0.88. */
interface RnCore {
  Clipboard?: { setString?(text: string): void };
}

function coreClipboard(): { setString?(text: string): void } | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- core Clipboard is absent from RN 0.88's public types but present at runtime; no new dep may be added (see docs/mobile/screens/assistant.md).
    const rn = require("react-native") as RnCore;
    return rn.Clipboard;
  } catch {
    return undefined;
  }
}

/**
 * Copy `text` to the system clipboard («تم النسخ» toast) — or, when the
 * core API is gone, hand the text to the native share sheet (iOS/Android
 * both offer «نسخ» there). The fallback toast says exactly what happened.
 */
export function copyTextWithToast(text: string, contextLabel = "النص"): void {
  const api = coreClipboard();
  if (typeof api?.setString === "function") {
    try {
      api.setString(text);
      toast.success("تم النسخ");
      return;
    } catch {
      // fall through to the share sheet — copy must never crash the chat
    }
  }
  void Share.share({ message: text, title: contextLabel }).catch(() => {
    toast.error("تعذّر النسخ");
  });
}
