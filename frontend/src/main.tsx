import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

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
// imported by its six lazy consumers (LandingPage — colleges trigger +
// popover, CollegePages, CompetitionsPages, AdminExtraPages,
// CommunityPages, AdminGovernancePages) and lands in their shared
// chunk. auth.css/student.css stay global (documented cross-page
// borrows, worklog 8-b).
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/auth.css';
import './styles/notifications.css';
import './styles/student.css';
import './styles/polish.css';
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

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
