/**
 * tokens.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.
 * Source of truth: shared/design-tokens.json (R326 M0.4).
 * Regen (repo root): npm run tokens:build · Gate: npm run tokens:check
 *
 * The MOBILE half of the shared Heron set. The typed public surface
 * (HeronPalette · StatusTone · the toneFor* mappers) lives in ./tokens,
 * which re-exports this data — every existing import keeps working.
 */

export const heron = {
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
    text: "#F6F6EE",
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
    rule: "#4A4A48",
    gold: "#E0A067",
    goldInk: "#F2B782",
    onSurface: "#F6F6EE",
    onSurfaceMuted: "#B4B4B0",
  },
};

export const statusTones = {
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

export const tierColors = {
  BRONZE: "#A7724E",
  SILVER: "#9CA3AF",
  GOLD: "#D4A537",
  PLATINUM: "#7B3AED",
};

// The mobile px type ladder (Arabic 13px floor) — the web runs the
// fluid-rem ladder in tokens.css, platform-specific by design.
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

// The spacing ladder (px-keyed — the mobile half of webRungs).
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
  96: 96,
  128: 128,
  160: 160,
  192: 192,
  240: 240,
} as const;

export const motion = {
  micro: 80,
  fast: 200,
  base: 400,
  slow: 500,
  slower: 650,
  cinema: 900,
  sheetExit: 835,
  guestReveal: 700,
} as const;

export const heronEase = [0.23, 1, 0.32, 1] as const;

// Heron radius discipline: 0 everywhere; circles only for round elements.
export const radius = {
  none: 0,
  full: 9999,
} as const;

export const touchFloor = 44;
