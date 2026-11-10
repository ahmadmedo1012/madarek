/**
 * Illustration — R345 F · the theme-aware seat for the R342 original
 * illustration register (`src/media/illustrations.generated.ts`, the
 * byte-synced twin of the web manifest — the art is never forked).
 *
 * Loads the light/dark twin for the RESOLVED theme (useTheme — the
 * system preference included) from the web origin through expo-image
 * (memory+disk caching, sunken placeholder, 200ms fade — the campus
 * photo-seat pattern). The paper is baked into each twin at the
 * theme's own ground, so the frame sits on the app's paper surface
 * with no blend and no layout shift on theme flip (same geometry,
 * same intrinsic size).
 *
 * A11y: informative pieces carry the contract's Arabic alt; decorative
 * pieces render with an empty label and accessibilityElementsHidden.
 */
import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme, usePalette, useSemanticTheme } from "@/design/theme";
import { ILLUSTRATIONS, type IllustrationSpec } from "@/media/illustrations.generated";
import { API_BASE } from "@/api/client";

/** The web origin that serves /media/** (API_BASE minus /api/v1). */
const WEB_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");

export interface IllustrationProps {
  /** the register id, e.g. "r342/role-student" */
  id: keyof typeof ILLUSTRATIONS | string;
  /** rendered width (pt) — height follows the intrinsic aspect unless overridden */
  width: number | `${number}%`;
  /** fixed band height (pt) — crops via contentFit cover (hero bands) */
  height?: number;
  /** rounded corners are ALWAYS 0 (the Heron law) — a hairline frame is optional */
  framed?: boolean;
  /** override the contract alt (defaults to altAr for informative pieces) */
  accessibilityLabel?: string;
}

export function Illustration({ id, width, height, framed, accessibilityLabel }: IllustrationProps) {
  const spec: IllustrationSpec | undefined = ILLUSTRATIONS[id as string];
  const { name: theme } = useTheme();
  const { colors } = useSemanticTheme();
  const p = usePalette();
  if (!spec) return null;

  const path = theme === "dark" ? spec.dark : spec.light;
  const aspect = spec.w > 0 && spec.h > 0 ? spec.w / spec.h : 1;
  const alt = accessibilityLabel ?? (spec.decorative ? "" : spec.altAr);

  return (
    <Image
      source={{ uri: `${WEB_ORIGIN}${path}` }}
      contentFit="cover"
      transition={200}
      recyclingKey={`${id}-${theme}`}
      accessible={!spec.decorative}
      accessibilityLabel={alt}
      style={{
        width,
        ...(height != null ? { height } : { aspectRatio: aspect }),
        backgroundColor: colors.sunken,
        ...(framed
          ? { borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }
          : null),
      }}
    />
  );
}
