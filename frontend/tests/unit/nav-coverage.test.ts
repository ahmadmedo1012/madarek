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
 *  had zero inbound links repo-wide. PP-X2 (audit P3-25) removed
 *  /student/exams from this list: the «تحليل الاختبارات» hub was 4
 *  cards (3 repeating sidebar destinations + 1 «قيد الإعداد») — the
 *  page is deleted and the route redirects to /student/online-exams,
 *  so it is deliberately NOT nav-reachable anymore. */
const FORMER_ORPHANS = [
  '/student/social',
  '/student/webinars',
  '/student/mooc',
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

  it('the exams hub left the student nav — /student/exams redirects (PP-X2, audit P3-25)', () => {
    // One exams entry, one name: «الاختبارات الإلكترونية» is the real
    // list; the former «تحليل الاختبارات» hub (a page of links to
    // other sidebar destinations) is deleted and its route redirects.
    const dests = allDestinations(STUDENT_NAV);
    expect(dests).not.toContain('/student/exams');
    expect(dests).toContain('/student/online-exams');
    const examLabels = STUDENT_NAV.flatMap((g) => g.items)
      .filter((i) => i.to.includes('exams'))
      .map((i) => i.label);
    expect(examLabels).toEqual(['الاختبارات الإلكترونية']);
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

  it('no group in ANY role exceeds the 9-item ceiling — the junk drawer is gone (A4 P2-7; r183-B6)', () => {
    // r183-B6 (A4 P3-8): the student-only ceiling let «لوحة التدريس»
    // grow to 10 items — the grading trio (grades/assignments/exams)
    // now lives in its own «التقييم والتصحيح» group, and the gate
    // covers every role's every group so no mega-group can regrow.
    for (const [role, nav] of Object.entries(NAV_BY_ROLE)) {
      for (const g of nav) {
        expect(
          g.items.length,
          `${role} · ${g.label}: ${g.items.length} items`,
        ).toBeLessThanOrEqual(9);
      }
    }
  });

  it('the teacher grading trio is its own «التقييم والتصحيح» group (r183-B6, A4 P3-8)', () => {
    const groups = new Map(TEACHER_NAV.map((g) => [g.label, g.items.map((i) => i.to)]));
    const grading = groups.get('التقييم والتصحيح');
    expect(grading).toEqual(['/teacher/grades', '/teacher/assignments', '/teacher/exams']);
    // «لوحة التدريس» shed exactly the trio — nothing else moved.
    expect(groups.get('لوحة التدريس')).toEqual([
      '/teacher/dashboard',
      '/teacher/intelligence',
      '/teacher/performance',
      '/teacher/schedule',
      '/teacher/attendance',
      '/teacher/students',
      '/teacher/materials',
    ]);
  });
});

describe('STUDENT_NAV — the r183-B7 drawer re-cut (A4 P2-3: 33 items / 3.2 screens → ≤2)', () => {
  // A4 live-measured the student drawer at 390×844: 33 items / 5 groups,
  // .sidebar-nav scrollHeight 1749px vs 546px clientHeight = 3.2 screens
  // of scrolling before the account cluster. The re-cut folds the
  // low-frequency families behind collapsible group headers (nav.ts
  // `collapsed: true`, rendered as ONE toggle row by Sidebar.tsx) so the
  // DEFAULT drawer is ≤16 rows while every route keeps its sidebar home.
  // The achievements fold A4 sketched («النقاط»+«مهاراتي» into
  // /achievements) was measured infeasible: the achievements page
  // exposes no entries to them and no other surface links either route
  // (census r183-B7) — so the family collapses as a whole instead.

  it('every route keeps its sidebar home — the A4 census 33+1, zero cuts', () => {
    // The orphan guards above stay green because NOTHING left the nav;
    // any future cut must consciously update this pin AND re-verify the
    // destination is linked from another nav item's page.
    // R320 cycle-3 override: 33 → 34 — the ANY-AUTHED /settings door
    // (PAGES-GAP P2-1) joined every role's nav; a deliberate ADD, the
    // census otherwise unchanged.
    expect(allDestinations(STUDENT_NAV)).toHaveLength(34);
  });

  it('the default-visible drawer is ≤16 items — A4\'s 33-row drawer folds behind 4 collapsed groups', () => {
    const visible = STUDENT_NAV.filter((g) => !g.collapsed).flatMap((g) => g.items);
    expect(visible.length).toBeLessThanOrEqual(16);
    const collapsedLabels = STUDENT_NAV.filter((g) => g.collapsed).map((g) => g.label);
    // The exact four families (drift guard): immersive learning, growth,
    // community/opportunities, university services.
    expect(collapsedLabels).toEqual([
      'المعامل والتقنيات',
      'التطوير والتقدّم',
      'المجتمع والفرص',
      'خدمات الجامعة',
    ]);
  });

  it('the always-visible spine carries the high-frequency study surfaces', () => {
    const visible = STUDENT_NAV.filter((g) => !g.collapsed).flatMap((g) => g.items.map((i) => i.to));
    for (const core of [
      '/student/dashboard',
      '/student/schedule',
      '/student/calendar',
      '/student/courses',
      '/student/catalog',
      '/student/results',
      '/student/online-exams',
      '/student/library',
      '/student/ai',
      '/student/profile',
      '/student/messages',
      '/student/alerts',
    ]) {
      expect(visible, core).toContain(core);
    }
  });

  it('the university-services hub A4 sketched: no hub surface exists — the task\'s collapsed-section fallback', () => {
    // UniversityInfoPage links nothing to map/downloads/payment (and the
    // pages are out of the wave's file scope), so the four utilities +
    // the roadmap live in ONE collapsed «خدمات الجامعة» group. The
    // campus-map CTA still cross-links map → university.
    const services = STUDENT_NAV.find((g) => g.label === 'خدمات الجامعة');
    expect(services?.collapsed).toBe(true);
    expect(services?.items.map((i) => i.to)).toEqual([
      '/student/payment',
      '/student/university',
      '/student/map',
      '/student/downloads',
      '/vision',
    ]);
  });

  it('the achievements trio keeps its three sidebar homes (fold would orphan — census r183-B7)', () => {
    const dests = allDestinations(STUDENT_NAV);
    expect(dests).toContain('/achievements');
    expect(dests).toContain('/student/gamification');
    expect(dests).toContain('/student/skills');
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
