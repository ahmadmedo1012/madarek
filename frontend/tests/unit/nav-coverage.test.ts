/**
 * Navigation coverage (4-A14 P1-1, wave 21-a).
 *
 * Nine built surfaces used to be URL-only — zero inbound links from
 * any nav config, page, or component. The fix surfaces them in
 * nav.ts: the seven student «المزيد» destinations + /student/exams
 * (learning group) + the shared /vision roadmap entry in EVERY role's
 * nav. This suite pins the regression: a route that loses its last
 * inbound nav link fails here.
 */
import { describe, expect, it } from 'vitest';
import {
  STUDENT_NAV,
  TEACHER_NAV,
  ADMIN_NAV,
  QUALITY_NAV,
  OWNER_NAV,
  NAV_BY_ROLE,
} from '../../src/lib/nav';

const allDestinations = (nav: ReturnType<typeof Object>) =>
  (nav as Array<{ items: Array<{ to: string }> }>).flatMap((g) => g.items.map((i) => i.to));

/** The 4-A14 P1-1 census: routes that rendered real seeded content but
 *  had zero inbound links repo-wide. */
const FORMER_ORPHANS = [
  '/student/social',
  '/student/webinars',
  '/student/mooc',
  '/student/exams',
  '/student/downloads',
  '/student/gamification',
  '/student/skills',
  '/student/ar',
  '/vision',
];

describe('nav.ts — no orphan routes (4-A14 P1-1)', () => {
  it('every former student orphan appears in STUDENT_NAV', () => {
    const studentDests = allDestinations(STUDENT_NAV);
    for (const route of FORMER_ORPHANS) {
      expect(studentDests, route).toContain(route);
    }
  });

  it('the shared /vision roadmap is reachable from EVERY role nav', () => {
    for (const nav of [STUDENT_NAV, TEACHER_NAV, ADMIN_NAV, QUALITY_NAV, OWNER_NAV]) {
      expect(allDestinations(nav), 'vision entry').toContain('/vision');
    }
  });

  it('no duplicate destinations inside a single role nav', () => {
    for (const [role, nav] of Object.entries(NAV_BY_ROLE)) {
      const dests = allDestinations(nav);
      expect(new Set(dests).size, role).toBe(dests.length);
    }
  });

  it('labels disambiguate the three achievements surfaces (A14 P3-2)', () => {
    const studentLabels = STUDENT_NAV.flatMap((g) => g.items.map((i) => i.label));
    // /achievements keeps «الإنجازات والشهادات» — the XP and skills
    // surfaces must not share the «إنجازات/شهادات» wording.
    expect(studentLabels).toContain('الإنجازات والشهادات');
    expect(studentLabels).toContain('النقاط والمستويات');
    expect(studentLabels).toContain('مهاراتي');
    expect(studentLabels.filter((l) => l.startsWith('الإنجازات'))).toHaveLength(1);
  });
});
