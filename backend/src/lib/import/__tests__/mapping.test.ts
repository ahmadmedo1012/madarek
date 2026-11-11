/**
 * master-F1 — the import mapping engine contract.
 *
 * Pins §9.4's column intelligence: the Arabic/English alias families
 * resolve to canonical targets, unknown columns are LISTED (never
 * dropped silently), mixed headers report their language, and saved
 * mapping profiles replay against new files (stale targets degrade to
 * unknown — listed, never guessed).
 */
import { describe, expect, it } from 'vitest';
import {
  applyMappingProfile,
  buildColumnMap,
  detectHeadersLanguage,
  toMappingProfile,
} from '../mapping.js';

const AR_ALIASES = [
  'الاسم الأول',
  'اسم الطالب',
  'الاسم الكامل',
  'اسم التلميذ',
  'الرقم الدراسي',
  'رقم القيد',
  'الرقم الجامعي',
  'رقم الهاتف',
  'هاتف الطالب',
  'رقم ولي الأمر',
  'القسم',
  'الصف',
  'الفصل',
  'السنة الدراسية',
  'التخصص',
];

describe('master-F1 mapping — the §9.4 alias families', () => {
  it('every documented Arabic alias maps to a known target (never unknown)', () => {
    for (const h of AR_ALIASES) {
      const map = buildColumnMap([h]);
      expect(map.columns[0]!.target, `${h} → ${map.columns[0]!.target}`).not.toBe('unknown');
      expect(map.columns[0]!.confidence).toBeGreaterThan(0);
    }
  });

  it('header language detection: ar / en / mixed', () => {
    expect(detectHeadersLanguage(['الاسم', 'القسم'])).toBe('ar');
    expect(detectHeadersLanguage(['First Name', 'Department'])).toBe('en');
    expect(detectHeadersLanguage(['الاسم', 'Email'])).toBe('mixed');
  });

  it('unknown columns are listed, never dropped', () => {
    const map = buildColumnMap(['الاسم الكامل', 'هواية الطالب المفضلة']);
    expect(map.unknownColumns).toEqual(['هواية الطالب المفضلة']);
    expect(map.columns).toHaveLength(2);
  });

  it('custom fields route through the custom target with their key', () => {
    const map = buildColumnMap(['الاسم الكامل', 'لون الباص'], [{ key: 'busColor', labelAr: 'لون الباص' }]);
    expect(map.columns[1]!.target).toBe('custom');
    expect(map.columns[1]!.customKey).toBe('busColor');
  });

  it('a saved profile replays against a reordered header row', () => {
    const first = buildColumnMap(['الاسم الكامل', 'رقم القيد']);
    const profile = toMappingProfile(first);
    const replay = applyMappingProfile(['رقم القيد', 'الاسم الكامل'], profile, []);
    const bySource = new Map(replay.columns.map((c) => [c.source, c.target]));
    expect(bySource.get('رقم القيد')).not.toBe('unknown');
    expect(bySource.get('الاسم الكامل')).not.toBe('unknown');
  });

  it('a stale profile target degrades to unknown (listed, never guessed)', () => {
    const replay = applyMappingProfile(
      ['الاسم الكامل'],
      { version: 1, columns: [{ source: 'الاسم الكامل', target: 'notARealTarget' }] },
      [],
    );
    expect(replay.columns[0]!.target).toBe('unknown');
  });
});
