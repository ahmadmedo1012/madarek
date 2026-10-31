/**
 * The Heron design system — native tokens.
 *
 * R326 M0.4 — the DATA now lives in ./tokens.generated (generated from
 * shared/design-tokens.json — the ONE source of truth shared with the
 * web; regen: `npm run tokens:build` at the repo root, drift-gated by
 * `npm run tokens:check` in CI). This module keeps the typed public
 * surface and the semantic mappers, so every existing import keeps
 * working unchanged.
 *
 * The generation killed two real drifts the old hand-copy carried
 * (evidence for why the shared source exists):
 *   · dark ink #F6F8FA → #F6F6EE (the web's R324 X22 warm-paper override)
 *   · dark rule #5C5C5A → #4A4A48 (the web's night hairline tier)
 *
 * Paper grounds, graphite ink, hairlines, radius 0, one orange signal.
 * Zero shadows; emphasis comes from ink weight, hairlines, and the accent.
 */
import {
  heron as heronData,
  heronEase,
  motion,
  radius,
  sp,
  statusTones as statusTonesData,
  tierColors as tierColorsData,
  touchFloor,
  type as typeScale,
} from "./tokens.generated";

export type ThemeName = "light" | "dark";

export interface HeronPalette {
  bg: string;
  surface: string;
  surfaceHover: string;
  overlay: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentHover: string;
  accentInk: string;
  accentSoft: string;
  accentStrong: string;
  accentFg: string;
  primary: string;
  primaryFg: string;
  border: string;
  rule: string;
  gold: string;
  goldInk: string;
  onSurface: string;
  onSurfaceMuted: string;
}

export const heron: Record<ThemeName, HeronPalette> = heronData;

export interface StatusTone {
  bg: string;
  ink: string;
  deep: string;
}

export type StatusToneName =
  | "mint"
  | "yellow"
  | "rose"
  | "sky"
  | "lavender"
  | "copper"
  | "grey";

export const statusTones: Record<ThemeName, Record<StatusToneName, StatusTone>> =
  statusTonesData;

/** Semantic tone mapping for notification & attendance kinds. */
export const toneForNotificationType = (
  type: "URGENT" | "ACADEMIC" | "SYSTEM" | "SOCIAL" | string,
): StatusToneName => {
  switch (type) {
    case "URGENT":
      return "rose";
    case "ACADEMIC":
      return "sky";
    case "SOCIAL":
      return "lavender";
    case "SYSTEM":
    default:
      return "grey";
  }
};

export const toneForAttendanceStatus = (
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | string,
): StatusToneName => {
  switch (status) {
    case "PRESENT":
      return "mint";
    case "LATE":
      return "yellow";
    case "ABSENT":
      return "rose";
    case "EXCUSED":
      return "sky";
    default:
      return "grey";
  }
};

/** Gamification tier orbs. */
export const tierColors: Record<string, string> = tierColorsData;

// ---------- Typographic scale (mobile-adapted from the fluid web ladder) ----------
// Arabic 13px readability floor; hierarchy via weight + size, not tracking.
export { typeScale as type };

export type Spacing = keyof typeof sp;

export { sp, motion, heronEase, radius, touchFloor };
