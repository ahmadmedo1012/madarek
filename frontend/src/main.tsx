import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// r323 B3.6 — the console tape installs ONCE (idempotent) before the
// first render: every console.error / window error / unhandled
// rejection from here on lands in the ring the feedback widget ships.
import { installConsoleTape } from './lib/consoleTape';

// Self-hosted @font-face rules must come first so the families are
// registered before tokens.css/base.css reference them.
//
// Page-scoped split (D11, 11-g P1-2 — waves 12-15 + 13-17): pdf.css,
// owner.css and training.css moved into the lazy page modules that
// consume them (DocumentViewerPage; OwnerPages + ConfirmDialog/
// ToggleSwitch borrowers; TrainingPages + the shared track-card/
// leaderboard/filter-pill borrowers). 13-17 (D14) then unlocked
// landing.css and colleges.css by deduping the polish.css same-selector
// overrides first (.reveal-up timing, feature/bento spotlight blocks,
// .admin-students-search input): landing.css rides the LandingPage
// chunk; SectionAccent's cascade rules moved to motion.css (eager)
// because CollegePages renders that primitive too. colleges.css is
// imported by its three lazy consumers (CollegePages, CompetitionsPages,
// CommunityPages — r157: the admin roster chrome moved to admin.css,
// r150e/r152c) and lands in
// their shared chunk. (G final sweep: the landing's colleges popover
// is retired — r198's constellation replaced the never-rendered
// <CollegesPopover /> and its colleges-popover.css sheet is deleted.)
// auth.css/student.css stay global
// (documented cross-page borrows, worklog 8-b).
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
// patterns.css (Agent S r210) — the shared page-pattern sheet; all
// classes are pf-prefixed, so the placement after layout.css is
// collision-free. CONTRACT.md is the normative doc.
import './styles/patterns.css';
import './styles/auth.css';
import './styles/notifications.css';
import './styles/student.css';
import './styles/polish.css';
// r304: the r301/r302 «final-visual-system.css» bolt-on is DELETED —
// its declarations were folded back into their canonical layer homes
// (layout.css for the sidebar/nav chrome, components.css for buttons/
// tables/states/skeletons). An unlayered sheet parked last in main.tsx
// silently masked the overrides layer (polish's collapsed-rail topbar
// tint) and regressed the mobile table scroll rung; the cascade now
// ends at polish.css, and every recipe lives in exactly one home.
import App from './App';

// axe-core: surface a11y violations in the dev console only. No prod cost.
if (import.meta.env.DEV) {
  void import('@axe-core/react').then(({ default: axe }) => {
    void import('react').then((React) => {
      void import('react-dom').then((ReactDOM) => {
        axe(React.default ?? React, ReactDOM.default ?? ReactDOM, 1000);
      });
    });
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

installConsoleTape();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
