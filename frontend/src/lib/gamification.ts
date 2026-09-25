import type { BadgeRarity, Tier } from '../hooks/useResources';

/**
 * Shared gamification display maps (wave 13-15, audit 11-f P2-1 / D13).
 *
 * TIER_LABEL + TIER_COLOR were duplicated verbatim between
 * pages/student/MorePages.tsx (GamificationPage) and
 * pages/student/TrainingPages.tsx; RARITY_* lived only in TrainingPages
 * but belong to the same badge economy. Every value is byte-identical to
 * the local copies they replace — pure move, zero rendered change.
 *
 * Visual system: styles/training.css §gamification (tier orbs, XP bar,
 * achievement tiles, leaderboard ranks) consumes these via the
 * --tier-color / --rarity custom properties.
 */

/** Arabic tier names for the self-development points economy. */
export const TIER_LABEL: Record<Tier, string> = {
  BRONZE: 'برونزي',
  SILVER: 'فضي',
  GOLD: 'ذهبي',
  PLATINUM: 'بلاتيني',
};

/**
 * Data-driven tier hexes (API gamification palette) — consumed only via
 * the --tier-color custom property / color-mix tints, never as a text
 * ground (raw hex is deliberate: these are data-driven accents, not
 * themed surfaces — documented exception to token discipline).
 */
export const TIER_COLOR: Record<Tier, string> = {
  BRONZE: '#A7724E',
  SILVER: '#9CA3AF',
  GOLD: '#D4A537',
  PLATINUM: '#7B3AED',
};

/**
 * Badge-rarity hexes (same API palette). Consumed only through
 * color-mix tints over var(--surface) — never as a text ground.
 */
export const RARITY_COLOR: Record<BadgeRarity, string> = {
  COMMON: '#9CA3AF',
  RARE: '#2952C8',
  EPIC: '#7B3AED',
  LEGENDARY: '#D4A537',
};

/** Arabic badge-rarity names shown on achievement tiles.
 * EPIC/LEGENDARY corrected per 15-j P2-8: LEGENDARY conventionally
 * translates أسطوري, while the old LEGENDARY label «فريد» read as
 * "unique" — EPIC takes ملحمي so the top tier keeps its name. */
export const RARITY_LABEL: Record<BadgeRarity, string> = {
  COMMON: 'شائع',
  RARE: 'نادر',
  EPIC: 'ملحمي',
  LEGENDARY: 'أسطوري',
};
