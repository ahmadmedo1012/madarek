/**
 * 13-15 — lib/gamification.ts pins (audit 11-f P2-1 / D13).
 *
 * The tier/rarity display maps were duplicated verbatim between
 * MorePages (GamificationPage) and TrainingPages; these pins hold the
 * exact labels + the API gamification palette so the fold can never
 * drift from the copy that shipped.
 */
import { describe, expect, it } from 'vitest';
import {
  RARITY_COLOR,
  RARITY_LABEL,
  TIER_COLOR,
  TIER_LABEL,
} from '../../src/lib/gamification';

describe('TIER_LABEL (folded from MorePages + TrainingPages)', () => {
  it('holds the exact Arabic tier names', () => {
    expect(TIER_LABEL).toEqual({
      BRONZE: 'برونزي',
      SILVER: 'فضي',
      GOLD: 'ذهبي',
      PLATINUM: 'بلاتيني',
    });
  });
});

describe('TIER_COLOR (API gamification palette)', () => {
  it('holds the exact tier hexes', () => {
    expect(TIER_COLOR).toEqual({
      BRONZE: '#A7724E',
      SILVER: '#9CA3AF',
      GOLD: '#D4A537',
      PLATINUM: '#7B3AED',
    });
  });

  it('covers every Tier key', () => {
    expect(Object.keys(TIER_COLOR).sort()).toEqual(['BRONZE', 'GOLD', 'PLATINUM', 'SILVER']);
  });
});

describe('RARITY_COLOR (folded from TrainingPages)', () => {
  it('holds the exact rarity hexes', () => {
    expect(RARITY_COLOR).toEqual({
      COMMON: '#9CA3AF',
      RARE: '#2952C8',
      EPIC: '#7B3AED',
      LEGENDARY: '#D4A537',
    });
  });
});

describe('RARITY_LABEL (folded from TrainingPages)', () => {
  it('holds the exact Arabic rarity names for every BadgeRarity key', () => {
    expect(RARITY_LABEL).toEqual({
      COMMON: 'شائع',
      RARE: 'نادر',
      EPIC: 'ملحمي',
      LEGENDARY: 'أسطوري',
    });
    expect(Object.keys(RARITY_LABEL).sort()).toEqual(['COMMON', 'EPIC', 'LEGENDARY', 'RARE']);
  });
});
