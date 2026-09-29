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
import { resolveTitle } from '../../src/components/layout/AppShell';

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

describe('nav.ts — 5-B5 IA fixes (A4 P1-3 + P2-1/P2-2/P2-7 + 5-B4 hand-off)', () => {
  it('the teacher orphans are sidebar-reachable on desktop (A4 P1-3)', () => {
    const dests = allDestinations(TEACHER_NAV);
    // /teacher/students was bottom-nav only; performance + messages
    // were full URL-only orphans.
    expect(dests).toContain('/teacher/students');
    expect(dests).toContain('/teacher/performance');
    expect(dests).toContain('/teacher/messages');
  });

  it('every role carries its alerts page as a first-class sidebar item (A4 P2-8)', () => {
    const cases: Array<[string, string[]]> = [
      ['/student/alerts', allDestinations(STUDENT_NAV)],
      ['/teacher/alerts', allDestinations(TEACHER_NAV)],
      ['/admin/alerts', allDestinations(ADMIN_NAV)],
      ['/quality/alerts', allDestinations(QUALITY_NAV)],
      ['/owner/alerts', allDestinations(OWNER_NAV)],
    ];
    for (const [route, dests] of cases) {
      expect(dests, route).toContain(route);
    }
  });

  it('the admin analysis duplicate left the nav — folded into /admin/reports (5-B4)', () => {
    expect(allDestinations(ADMIN_NAV)).not.toContain('/admin/analysis');
    // Its replacement home still exists.
    expect(allDestinations(ADMIN_NAV)).toContain('/admin/reports');
  });

  it('the leaderboard left the student sidebar — /colleges CTA covers it (A4 P2-1)', () => {
    // The NavLink prefix-match on /colleges used to light BOTH items on
    // /colleges/leaderboard (double-active). Reachability moved to the
    // leaderboard CTA on the /colleges page (CollegePages.tsx
    // .leaderboard-cta).
    expect(allDestinations(STUDENT_NAV)).not.toContain('/colleges/leaderboard');
    expect(allDestinations(STUDENT_NAV)).toContain('/colleges');
  });

  it('student nav icons are unique — no Trophy ×3 / Building2 ×2 (A4 P3-4)', () => {
    const icons = STUDENT_NAV.flatMap((g) => g.items.map((i) => i.icon));
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('no student group exceeds the 9-item ceiling — the junk drawer is gone (A4 P2-7)', () => {
    for (const g of STUDENT_NAV) {
      expect(
        g.items.length,
        `${g.label}: ${g.items.length} items`,
      ).toBeLessThanOrEqual(9);
    }
  });
});

describe('nav.ts ↔ page titles — single source (5-B5, A4 P3-1/P3-2)', () => {
  it('resolveTitle derives every nav destination\'s title from its nav label', () => {
    // nav.ts is the one place a route's name lives: sidebar label ==
    // topbar title == document.title base. A manual PAGE_TITLES row or
    // a label rename that drifts from the rendered name fails here.
    for (const nav of [STUDENT_NAV, TEACHER_NAV, ADMIN_NAV, QUALITY_NAV, OWNER_NAV]) {
      for (const g of nav) {
        for (const item of g.items) {
          expect(resolveTitle(item.to), item.to).toBe(item.label);
        }
      }
    }
  });

  it('routes linked by several roles carry ONE label (cross-role drift guard)', () => {
    // /colleges used to read «كلّيّات الجامعة» ×4 + «صفحات الكلّيّات»
    // (admin); /competitions «المسابقات الأكاديميّة» + «المسابقات».
    // One label per intent — the shared surfaces must agree.
    const byRoute = new Map<string, Set<string>>();
    for (const nav of Object.values(NAV_BY_ROLE)) {
      for (const g of nav) {
        for (const item of g.items) {
          const labels = byRoute.get(item.to) ?? new Set<string>();
          labels.add(item.label);
          byRoute.set(item.to, labels);
        }
      }
    }
    for (const [route, labels] of byRoute) {
      expect(labels, route).toHaveLength(1);
    }
  });
});
