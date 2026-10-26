/**
 * R320 §B (c1-RENAME) — the rename belts.
 *
 * Belt 1 — no «الإدارة» role label outside the ledger's KEEP rows:
 * scans the role-label code paths (the roleLabels twin, the nav group
 * labels + dashboard items, the auth demo role buttons, the topbar label
 * code paths, the sidebar, the community role badge, the owner/admin
 * role pickers, the annotations role badge, the onboarding greeting, the
 * landing showcase data) as SOURCE strings; every surviving
 * definite-form «الإدارة»/«الادارة» line must be covered by a KEEP row
 * in the machine-readable sidecar `docs/redesign/r320/rename-keep.json`
 * (the file's keeps[].phrase). The canonical ADMIN forms are asserted
 * from the LIVE exported maps as well, so a literal that sneaks back
 * into the one source of truth fails here first.
 *
 * Belt 2 — the frontend/backend roleLabels twins MATCH: same keys, same
 * ADMIN value «المسجل العام» (the backend twin is read as source text —
 * importing it here would drag @prisma/client into the frontend graph;
 * the backend side of the same lock lives at
 * backend/src/lib/__tests__/roleLabels.test.ts).
 *
 * Full decision ledger (one row per occurrence): see
 * docs/redesign/r320/RENAME-LEDGER.md.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  ROLE_LABELS,
  ROLE_DASHBOARD_LABELS,
  AUTH_DEMO_ROLE_LABELS,
  roleLabel,
  roleDashboardLabel,
} from '../../src/lib/roleLabels';
import { ADMIN_NAV, NAV_BY_ROLE, ROLE_LABELS as NAV_ROLE_LABELS } from '../../src/lib/nav';

/* ── the sidecar (the machine-readable KEEP allowlist) ───────────── */

/* repo paths — `frontendRoot` is the vitest cwd's package root; the
   sidecar/scan targets are repo-root-relative, hence the `..` joins. */
const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = path.join(frontendRoot, '..');
const sidecarPath = path.join('docs', 'redesign', 'r320', 'rename-keep.json');
const sidecar = JSON.parse(readFileSync(path.join(repoRoot, sidecarPath), 'utf8')) as {
  canonical: { role: string; dashboard: string; reports: string; scope: string };
  belt1ScannedFiles: string[];
  keeps: { file: string; phrase: string; reason: string }[];
};

/* The definite-form office noun — the retired ADMIN role label. Bare
   «إدارة X» management-function names and «إداريّ» adjectives are
   LEGITIMATE (different things — see the ledger's KEEP rules) and do
   not match this pattern. */
const RETIRED_LABEL = /الإدارة|الادارة/;

describe('R320 §B rename — belt 1: no retired «الإدارة» role label outside the KEEP sidecar', () => {
  it('the sidecar lists the scanned files and its keeps are unique', () => {
    expect(sidecar.belt1ScannedFiles.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const keep of sidecar.keeps) {
      const key = `${keep.file} :: ${keep.phrase}`;
      expect(seen.has(key), `duplicate keep row: ${key}`).toBe(false);
      seen.add(key);
      expect(keep.reason.length, `keep row needs a reason: ${key}`).toBeGreaterThan(0);
    }
  });

  /* One row per scanned file: every line that still carries the retired
     definite-form label must be a ledger KEEP line (a keep phrase for
     THAT file appears on the line itself). */
  describe.each(sidecar.belt1ScannedFiles)('%s', (relPath) => {
    it('carries the retired label only on KEEP rows', () => {
      const source = readFileSync(path.join(repoRoot, relPath), 'utf8');
      const keepsForFile = sidecar.keeps.filter((k) => k.file === relPath);
      const offenders: string[] = [];
      source.split('\n').forEach((line, i) => {
        if (!RETIRED_LABEL.test(line)) return;
        const covered = keepsForFile.some((k) => line.includes(k.phrase));
        if (!covered) offenders.push(`  L${i + 1}: ${line.trim()}`);
      });
      expect(
        offenders,
        `retired «الإدارة» role label outside the KEEP sidecar:\n${offenders.join('\n')}\n` +
          `→ rename it (RENAME-LEDGER.md) or add the KEEP row to ${sidecarPath}`,
      ).toEqual([]);
    });
  });

  it('every keep row points at a scanned file (no orphan allowlist rows)', () => {
    const scanned = new Set(sidecar.belt1ScannedFiles);
    const orphans = sidecar.keeps.filter((k) => !scanned.has(k.file));
    expect(
      orphans.map((k) => `${k.file} :: ${k.phrase}`),
      'keep rows for files the belt never scan are dead rows — either scan the file or drop the row',
    ).toEqual([]);
  });

  /* The live maps — the belt's rendered-string half. */
  it('the ADMIN role label is «المسجل العام» in every live label map', () => {
    expect(roleLabel('ADMIN')).toBe('المسجل العام');
    expect(roleDashboardLabel('ADMIN')).toBe('لوحة المسجل العام');
    expect(ROLE_LABELS.ADMIN).toBe(sidecar.canonical.role);
    expect(ROLE_DASHBOARD_LABELS.ADMIN).toBe(sidecar.canonical.dashboard);
    expect(AUTH_DEMO_ROLE_LABELS.ADMIN).toBe('المسجل العام');
  });

  it('no role label in any map carries the retired office noun', () => {
    for (const map of [ROLE_LABELS, ROLE_DASHBOARD_LABELS, AUTH_DEMO_ROLE_LABELS]) {
      for (const [role, label] of Object.entries(map)) {
        expect(
          RETIRED_LABEL.test(label),
          `${role} label «${label}» carries the retired ADMIN office label`,
        ).toBe(false);
      }
    }
  });

  it('the ADMIN nav group + dashboard item use the canonical names (nav.ts re-exports the map)', () => {
    expect(NAV_ROLE_LABELS).toBe(ROLE_LABELS); // nav re-exports the ONE source
    const adminGroup = NAV_BY_ROLE.ADMIN.find((g) => g.items.some((i) => i.to === '/admin/dashboard'));
    expect(adminGroup?.label).toBe('المسجل العام'); // group label — NOT «الإدارة العامة»
    const dash = ADMIN_NAV.flatMap((g) => g.items).find((i) => i.to === '/admin/dashboard');
    expect(dash?.label).toBe('لوحة المسجل العام');
    for (const group of ADMIN_NAV) {
      expect(RETIRED_LABEL.test(group.label), `nav group «${group.label}»`).toBe(false);
    }
  });
});

describe('R320 §B rename — belt 2: the frontend/backend roleLabels twins match', () => {
  /* Extract the backend twin's ROLE_LABELS literal as source text. */
  const backendSource = readFileSync(
    path.join(repoRoot, 'backend', 'src', 'lib', 'roleLabels.ts'),
    'utf8',
  );
  const backendMap = new Map<string, string>();
  {
    const body = backendSource.match(/export const ROLE_LABELS[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '';
    for (const m of body.matchAll(/^\s*([A-Z_]+):\s*'([^']*)'/gm)) {
      backendMap.set(m[1]!, m[2]!);
    }
  }

  it('the backend twin was found and parses to five entries', () => {
    expect(backendMap.size).toBe(5);
  });

  it('same keys, same Arabic values — the two maps cannot drift', () => {
    expect([...backendMap.keys()].sort()).toEqual([...Object.keys(ROLE_LABELS)].sort());
    for (const [role, label] of Object.entries(ROLE_LABELS)) {
      expect(backendMap.get(role), `twin drift at ${role}`).toBe(label);
    }
  });

  it("the shared ADMIN value is «المسجل العام» on both sides", () => {
    expect(ROLE_LABELS.ADMIN).toBe('المسجل العام');
    expect(backendMap.get('ADMIN')).toBe('المسجل العام');
  });

  it('the twins cross-reference each other (the zero-drift contract)', () => {
    expect(backendSource, 'the backend twin must point at the frontend twin').toContain(
      'frontend/src/lib/roleLabels.ts',
    );
    const frontendSource = readFileSync(path.join(frontendRoot, 'src', 'lib', 'roleLabels.ts'), 'utf8');
    expect(frontendSource, 'the frontend twin must point at the backend twin').toContain(
      'backend/src/lib/roleLabels.ts',
    );
  });
});
