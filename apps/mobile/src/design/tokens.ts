/**
 * The Heron design system — native tokens.
 * Source of truth: frontend/src/styles/tokens.css (R313/R322/R323).
 * Paper grounds, graphite ink, hairlines, radius 0, one orange signal.
 * Zero shadows; emphasis comes from ink weight, hairlines, and the accent.
 */

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

export const heron: Record<ThemeName, HeronPalette> = {
  light: {
    bg: "#F6F6EE",
    surface: "#FFFFFF",
    surfaceHover: "#F0F0E6",
    overlay: "#FFFFFF",
    text: "#282828",
    textSecondary: "#414140",
    textMuted: "#62625F",
    textFaint: "#70706A",
    accent: "#FA3600",
    accentHover: "#D03000",
    accentInk: "#C72E00",
    accentSoft: "#FCE3D9",
    accentStrong: "#A32400",
    accentFg: "#FFFFFF",
    primary: "#282828",
    primaryFg: "#FFFFFF",
    border: "#E0E0DA",
    rule: "#B3B3AF",
    gold: "#B57438",
    goldInk: "#8F5A28",
    onSurface: "#282828",
    onSurfaceMuted: "#62625F",
  },
  dark: {
    bg: "#282828",
    surface: "#2E2E2E",
    surfaceHover: "#353535",
    overlay: "#2E2E2E",
    text: "#F6F8FA",
    textSecondary: "#C9C9C5",
    textMuted: "#B4B4B0",
    textFaint: "#A2A29D",
    accent: "#FF5A1F",
    accentHover: "#FF6B33",
    accentInk: "#FF6B33",
    accentSoft: "#432015",
    accentStrong: "#FFC5AE",
    accentFg: "#191918",
    primary: "#FFFFFF",
    primaryFg: "#191918",
    border: "#4A4A48",
    rule: "#5C5C5A",
    gold: "#E0A067",
    goldInk: "#F2B782",
    onSurface: "#F6F8FA",
    onSurfaceMuted: "#B4B4B0",
  },
};

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

export const statusTones: Record<ThemeName, Record<StatusToneName, StatusTone>> = {
  light: {
    mint: { bg: "#E3EBE1", ink: "#3F8F5C", deep: "#1B5430" },
    yellow: { bg: "#F5EBD6", ink: "#A8750F", deep: "#5E420C" },
    rose: { bg: "#F9E3DC", ink: "#F15534", deep: "#8C230A" },
    sky: { bg: "#E1E9F0", ink: "#4A7FA8", deep: "#1F4968" },
    lavender: { bg: "#ECE6FA", ink: "#8A6FE0", deep: "#3F2D7A" },
    copper: { bg: "#FCE3D9", ink: "#FA3600", deep: "#A32400" },
    grey: { bg: "#ECEDEB", ink: "#626260", deep: "#282828" },
  },
  dark: {
    mint: { bg: "#24372B", ink: "#84D0A0", deep: "#C4EBD2" },
    yellow: { bg: "#3B331F", ink: "#EFC87B", deep: "#F8E3B4" },
    rose: { bg: "#43241C", ink: "#FF8E68", deep: "#FFC5AE" },
    sky: { bg: "#23313F", ink: "#93C2E9", deep: "#C9E2F5" },
    lavender: { bg: "#2D2545", ink: "#B7A0F4", deep: "#DCD2F9" },
    copper: { bg: "#432015", ink: "#FF5A1F", deep: "#FFC5AE" },
    grey: { bg: "#2A2A28", ink: "#B7B2A6", deep: "#DDD8CB" },
  },
};

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
export const tierColors: Record<string, string> = {
  BRONZE: "#A7724E",
  SILVER: "#9CA3AF",
  GOLD: "#D4A537",
  PLATINUM: "#7B3AED",
};

// ---------- Typographic scale (mobile-adapted from the fluid web ladder) ----------
// Arabic 13px readability floor; hierarchy via weight + size, not tracking.
export const type = {
  monoXXS: 10,
  xs: 11,
  sm: 12,
  body: 13,
  bodyLg: 15,
  h4: 17,
  h3: 20,
  h2: 24,
  h1: 30,
  display: 36,
} as const;

// ---------- Spacing ladder (px) ----------
export const sp = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  56: 56,
  72: 72,
} as const;
export type Spacing = keyof typeof sp;

/** Motion durations (Heron: --t-micro/fast/base/slow). */
export const motion = {
  micro: 80,
  fast: 200,
  base: 400,
  slow: 500,
} as const;
export const heronEase = [0.23, 1, 0.32, 1] as const;

/** Heron radius discipline: 0 everywhere; circles only for round elements. */
export const radius = {
  none: 0,
  full: 9999,
} as const;

/** Minimum touch target (Heron 44px floor). */
export const touchFloor = 44;
