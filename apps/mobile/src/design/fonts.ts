import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { Alexandria_500Medium, Alexandria_600SemiBold, Alexandria_700Bold } from "@expo-google-fonts/alexandria";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";

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
