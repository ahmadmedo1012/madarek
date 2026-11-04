// R335 P0-7 — deep per-weight imports, not the package barrels. The barrels
// `require()` EVERY weight's .ttf (9 Alexandria + 7 Plex + 18 Geist Mono =
// 34 files ≈ 5.0 MB) so Metro ships them all even though fontMap below is
// the only consumer and references 9. Same disease as the lucide barrel
// (codemod-lucide-direct.mjs); this is the font-side cure: only the nine
// weights the Heron system actually uses ride the bundle (~1.65 MB).
import { IBMPlexSansArabic_400Regular } from "@expo-google-fonts/ibm-plex-sans-arabic/400Regular";
import { IBMPlexSansArabic_500Medium } from "@expo-google-fonts/ibm-plex-sans-arabic/500Medium";
import { IBMPlexSansArabic_600SemiBold } from "@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold";
import { IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic/700Bold";
import { Alexandria_500Medium } from "@expo-google-fonts/alexandria/500Medium";
import { Alexandria_600SemiBold } from "@expo-google-fonts/alexandria/600SemiBold";
import { Alexandria_700Bold } from "@expo-google-fonts/alexandria/700Bold";
import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono/400Regular";
import { GeistMono_500Medium } from "@expo-google-fonts/geist-mono/500Medium";

/**
 * Heron typography — Arabic-first.
 * Body/display: IBM Plex Sans Arabic (readable everything), Alexandria for
 * brand/display moments. Mono: Geist Mono for technical drafting labels.
 * Weights are the only hierarchy rungs (no tracking, no uppercase).
 */
export const fontMap = {
  "Body-Regular": IBMPlexSansArabic_400Regular,
  "Body-Medium": IBMPlexSansArabic_500Medium,
  "Body-SemiBold": IBMPlexSansArabic_600SemiBold,
  "Body-Bold": IBMPlexSansArabic_700Bold,
  "Display-Medium": Alexandria_500Medium,
  "Display-SemiBold": Alexandria_600SemiBold,
  "Display-Bold": Alexandria_700Bold,
  "Mono-Regular": GeistMono_400Regular,
  "Mono-Medium": GeistMono_500Medium,
} as const;

export type FontFamily = keyof typeof fontMap;

export const fonts = {
  body: "Body-Regular",
  bodyMedium: "Body-Medium",
  bodySemiBold: "Body-SemiBold",
  bodyBold: "Body-Bold",
  display: "Display-SemiBold",
  displayBold: "Display-Bold",
  mono: "Mono-Regular",
  monoMedium: "Mono-Medium",
} as const;
