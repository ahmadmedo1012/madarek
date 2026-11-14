/**
 * R350 I-P4 — the mapping presets, pinned:
 *
 *  · pure: applyPresetToHeaders is tolerant on the HEADER side
 *    («اسم الطالب» places where the template said «الاسم الكامل»)
 *    and strict on the TARGET side (unknown vocabulary degrades to
 *    not-placed — never guessed);
 *  · pure: presetCoverage scores the required targets and separates
 *    the university shape from the school shape;
 *  · pure: the ghweil stub is UNVERIFIED, carries its honest Arabic
 *    note, and demands the least (nameAr only) — a guess, labelled;
 *  · route: GET /import/presets serves the three (ghweil marked);
 *  · route: POST /import/parse carries presetSuggestions best-first
 *    with the coverage numbers.
 */
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'x'),
  verifyPassword: vi.fn(async () => false),
}));

vi.mock('../../src/db.js', () => {
  const p = {
    institution: { findFirst: vi.fn(async () => ({ id: 'inst-1', kind: 'UNIVERSITY' })), findUnique: vi.fn(async () => ({ id: 'inst-1', kind: 'UNIVERSITY' })) },
    institutionFieldDefinition: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(),
  };
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { prisma } from '../../src/db.js';
import {
  IMPORT_PRESETS,
  applyPresetToHeaders,
  presetCoverage,
  presetToProfile,
  type ImportPreset,
} from '../../src/lib/import/presets.js';
import { KNOWN_IMPORT_TARGETS } from '../../src/lib/import/mapping.js';
import { normalizeArabicSearch } from '../../src/modules/search/normalize.js';

let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let baseUrl: string;
const ownerAuth = { Authorization: `Bearer ${signAccessToken('owner-1', Role.OWNER, 'inst-1')}`, 'content-type': 'application/json' };

beforeAll(() => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const uni = IMPORT_PRESETS.find((p) => p.id === 'generic-university') as ImportPreset;
const school = IMPORT_PRESETS.find((p) => p.id === 'generic-school') as ImportPreset;
const ghweil = IMPORT_PRESETS.find((p) => p.id === 'ghweil-school') as ImportPreset;

describe('R350 I-P4 — the preset engine (pure)', () => {
  it('tolerant on headers: «اسم الطالب» places where the template said «الاسم الكامل»', () => {
    const placed = applyPresetToHeaders(
      uni,
      ['اسم الطالب', 'الرقم الجامعي', 'السنة', 'الكلية', 'التخصص'],
      normalizeArabicSearch,
      KNOWN_IMPORT_TARGETS,
    );
    expect(placed.get('اسم الطالب')).toBe('nameAr');
    expect(placed.get('الرقم الجامعي')).toBe('universityId');
    expect(placed.get('السنة')).toBe('year');
    expect(placed.get('الكلية')).toBe('faculty');
    expect(placed.get('التخصص')).toBe('department');
  });

  it('strict on targets: an unknown target never places (degrades honestly)', () => {
    const rogue: ImportPreset = {
      ...uni,
      rules: [{ aliases: ['الاسم'], target: 'not-a-real-target' }, ...uni.rules],
    };
    const placed = applyPresetToHeaders(rogue, ['الاسم'], normalizeArabicSearch, KNOWN_IMPORT_TARGETS);
    expect(placed.has('الاسم')).toBe(false);
  });

  it('coverage separates the university shape from the school shape', () => {
    const uniHeaders = ['الاسم الكامل', 'رقم القيد', 'السنة الدراسية', 'الكلية', 'القسم'];
    const uniOnUni = presetCoverage(uni, uniHeaders, normalizeArabicSearch, KNOWN_IMPORT_TARGETS);
    const schoolOnUni = presetCoverage(school, uniHeaders, normalizeArabicSearch, KNOWN_IMPORT_TARGETS);
    expect(uniOnUni.coverage).toBe(1); // nameAr + universityId + year all placed
    expect(uniOnUni.missingTargets).toEqual([]);
    expect(schoolOnUni.coverage).toBe(2 / 3); // stage missing — the school shape does not fit
    expect(schoolOnUni.missingTargets).toEqual(['stage']);
  });

  it('the ghweil stub is UNVERIFIED, honestly labelled, and demands the least', () => {
    expect(ghweil.verified).toBe(false);
    expect(ghweil.noteAr).toContain('غير موثّق');
    expect(ghweil.noteAr).toContain('عينة');
    const onGhweilShape = presetCoverage(ghweil, ['الاسم', 'الرقم', 'الصف', 'الفصل'], normalizeArabicSearch, KNOWN_IMPORT_TARGETS);
    expect(onGhweilShape.coverage).toBe(1); // nameAr only — a guess, labelled
  });

  it('presetToProfile serialises to the saveable MappingProfile shape', () => {
    const profile = presetToProfile(ghweil);
    expect(profile.version).toBe(1);
    expect(profile.columns.length).toBe(ghweil.rules.length);
    expect(profile.columns.every((c) => KNOWN_IMPORT_TARGETS.has(c.target))).toBe(true);
  });
});

describe('R350 I-P4 — the routes', () => {
  it('GET /import/presets serves the three, ghweil marked unverified with its note', async () => {
    const res = await fetch(`${baseUrl}/api/v1/import/presets`, { headers: ownerAuth });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; verified: boolean; noteAr?: string; requiredTargets: string[] }[] };
    expect(body.data.map((p) => p.id)).toEqual(['generic-university', 'generic-school', 'ghweil-school']);
    const stub = body.data.find((p) => p.id === 'ghweil-school')!;
    expect(stub.verified).toBe(false);
    expect(stub.noteAr).toContain('غير موثّق');
    expect(body.data.filter((p) => p.verified)).toHaveLength(2);
  });

  it('POST /import/parse carries presetSuggestions best-first with the coverage numbers', async () => {
    const mocked = prisma as unknown as { institutionFieldDefinition: { findMany: ReturnType<typeof vi.fn> } };
    mocked.institutionFieldDefinition.findMany.mockResolvedValue([]);
    const fileBase64 = Buffer.from(
      '\uFEFFالاسم الكامل,رقم القيد,السنة الدراسية,الكلية,القسم\nسالم العماري,9001,2,كلية العلوم,علوم الحاسب\n',
      'utf8',
    ).toString('base64');
    const res = await fetch(`${baseUrl}/api/v1/import/parse`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ institutionId: 'inst-1', entity: 'STUDENT', fileBase64 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { presetSuggestions: { id: string; coverage: number; verified: boolean }[] } };
    const suggestions = body.data.presetSuggestions;
    expect(suggestions).toHaveLength(3);
    // best-first: the university shape wins on a university file
    expect(suggestions[0]!.id).toBe('generic-university');
    expect(suggestions[0]!.coverage).toBe(1);
    // the coverages are sorted descending
    const covs = suggestions.map((s) => s.coverage);
    expect([...covs].sort((a, b) => b - a)).toEqual(covs);
  });

  it('POST /import/parse with presetId applies the preset as the suggested map (F2: the chip\'s one tap)', async () => {
    const mocked = prisma as unknown as { institutionFieldDefinition: { findMany: ReturnType<typeof vi.fn> } };
    mocked.institutionFieldDefinition.findMany.mockResolvedValue([]);
    // the header SPELLING differs from the template's first alias — the
    // preset's alias list (not just the first spelling) must place it
    const fileBase64 = Buffer.from(
      '\uFEFFاسم الطالب,الرقم الجامعي,التخصص\nسالم العماري,9001,علوم الحاسب\n',
      'utf8',
    ).toString('base64');
    const res = await fetch(`${baseUrl}/api/v1/import/parse`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({ institutionId: 'inst-1', entity: 'STUDENT', fileBase64, presetId: 'generic-university' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { suggestedMap: { columns: { source: string; target: string }[] }; unknownColumns: string[] } };
    const bySource = new Map(body.data.suggestedMap.columns.map((c) => [c.source, c.target]));
    expect(bySource.get('اسم الطالب')).toBe('nameAr');
    expect(bySource.get('الرقم الجامعي')).toBe('universityId');
    expect(bySource.get('التخصص')).toBe('department');
    expect(body.data.unknownColumns).toEqual([]);
  });
});
