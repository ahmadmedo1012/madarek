/**
 * R320 §B (c1-RENAME) — the backend side of the roleLabels twin lock.
 *
 * The backend map (this directory's ../roleLabels.ts) and the frontend
 * twin (frontend/src/lib/roleLabels.ts) MUST carry the same Arabic
 * display names — the ADMIN role is «المسجل العام» on both sides, so
 * backend messages/exports and the UI can never drift. The frontend
 * side of the same lock lives at
 * frontend/tests/unit/r320-rename-belt.test.ts (belt 2).
 *
 * The frontend twin is read as SOURCE TEXT here — importing it would
 * pull the frontend's TS module graph (../stores/auth.store) into the
 * backend runner; the regexes below extract the literal entries.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Role, StaffRole } from '@prisma/client';
import { ROLE_LABELS, roleLabel, ROLE_LABEL_INDEFINITE, ROLE_LABEL_PLURAL_OBLIQUE, STAFF_ROLE_LABELS } from '../roleLabels.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const frontendTwinPath = path.join(
  repoRoot,
  'frontend',
  'src',
  'lib',
  'roleLabels.ts',
);

function extractMap(source: string, constName: string): Map<string, string> {
  const map = new Map<string, string>();
  const body =
    source.match(new RegExp(`export const ${constName}[^{]*\\{([\\s\\S]*?)\\n\\};`))?.[1] ?? '';
  for (const m of body.matchAll(/^\s*([A-Z_]+):\s*'([^']*)'/gm)) {
    map.set(m[1]!, m[2]!);
  }
  return map;
}

describe('R320 §B — backend roleLabels (the twin of the frontend map)', () => {
  it('covers all five roles with the canonical Arabic names', () => {
    expect(Object.keys(ROLE_LABELS).sort()).toEqual([...Object.values(Role)].sort());
    expect(ROLE_LABELS.STUDENT).toBe('طالب');
    expect(ROLE_LABELS.TEACHER).toBe('أستاذ');
    expect(ROLE_LABELS.ADMIN).toBe('المسجل العام');
    expect(ROLE_LABELS.QUALITY).toBe('أخصائي جودة');
    expect(ROLE_LABELS.OWNER).toBe('مالك المنصة');
    expect(roleLabel(Role.ADMIN)).toBe('المسجل العام');
  });

  it('carries the ADMIN indefinite/plural forms the messages use', () => {
    expect(ROLE_LABEL_INDEFINITE.ADMIN).toBe('مسجل عام');
    expect(ROLE_LABEL_PLURAL_OBLIQUE.ADMIN).toBe('المسجلين العامّين');
  });

  it('no backend role label carries the retired «الإدارة» office label', () => {
    for (const [role, label] of Object.entries(ROLE_LABELS)) {
      expect(/الإدارة|الادارة/.test(label), `${role} → «${label}»`).toBe(false);
    }
  });
});

describe('R320 §B — the frontend/backend roleLabels twins match', () => {
  const frontendSource = readFileSync(frontendTwinPath, 'utf8');
  const frontendMap = extractMap(frontendSource, 'ROLE_LABELS');
  const backendSource = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'roleLabels.ts'),
    'utf8',
  );

  it('the frontend twin was found and parses to five entries', () => {
    expect(frontendMap.size).toBe(5);
  });

  it('R353 E2 — the STAFF_ROLE_LABELS twins match (the four Libyan offices)', () => {
    /* The frontend staff map lives in auth.store.ts (not roleLabels.ts)
     * — extract it from source the same way. */
    const storeSource = readFileSync(
      path.join(repoRoot, 'frontend', 'src', 'stores', 'auth.store.ts'),
      'utf8',
    );
    const frontendStaff = extractMap(storeSource, 'STAFF_ROLE_LABELS');
    const backendStaff = extractMap(backendSource, 'STAFF_ROLE_LABELS');
    expect(frontendStaff.size).toBe(4);
    expect(backendStaff.size).toBe(4);
    for (const [k, v] of backendStaff) {
      expect(frontendStaff.get(k), `staff label ${k}`).toBe(v);
    }
    expect(backendStaff.get('EXAMS_CONTROLLER')).toBe('مراقب الامتحانات');
    expect(backendStaff.get('QUALITY_OFFICER')).toBe('موظف الجودة');
    /* The extracted-source map must equal the imported runtime map —
     * the Prisma StaffRole enum and STAFF_ROLE_LABELS are the same
     * four offices the source text declares (kills TS6133 while
     * making the lock stronger). */
    expect([...Object.values(StaffRole)].sort()).toEqual([...backendStaff.keys()].sort());
    for (const [k, v] of Object.entries(STAFF_ROLE_LABELS)) {
      expect(backendStaff.get(k), `imported staff label ${k}`).toBe(v);
    }
  });

  it('same keys, same Arabic values — the two maps cannot drift', () => {
    expect([...frontendMap.keys()].sort()).toEqual([...Object.keys(ROLE_LABELS)].sort());
    for (const [role, label] of Object.entries(ROLE_LABELS)) {
      expect(frontendMap.get(role), `twin drift at ${role}`).toBe(label);
    }
  });

  it('the shared ADMIN value is «المسجل العام» on both sides', () => {
    expect(ROLE_LABELS.ADMIN).toBe('المسجل العام');
    expect(frontendMap.get('ADMIN')).toBe('المسجل العام');
  });

  it('the twins cross-reference each other (the zero-drift contract)', () => {
    expect(backendSource, 'the backend twin must point at the frontend twin').toContain(
      'frontend/src/lib/roleLabels.ts',
    );
    expect(frontendSource, 'the frontend twin must point at the backend twin').toContain(
      'backend/src/lib/roleLabels.ts',
    );
  });
});
