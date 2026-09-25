import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted @font-face rules must come first so the families are
// registered before tokens.css/base.css reference them.
//
// Page-scoped split (D11, 11-g P1-2 — wave 12-15): pdf.css, owner.css
// and training.css moved into the lazy page modules that consume them
// (DocumentViewerPage; OwnerPages + ConfirmDialog/ToggleSwitch borrowers;
// TrainingPages + the shared track-card/leaderboard/filter-pill borrowers)
// — they are never styled on the public funnel, so they no longer belong
// on the render-blocking critical path.
//
// landing.css and colleges.css stay eager ON PURPOSE: polish.css (later
// in this list) overrides same-layer selectors from both files
// (.reveal-up reveal timing for landing; .admin-students-search input
// height for colleges) — an async chunk's CSS is appended AFTER the
// entry CSS, which would flip those within-layer decisions and change
// approved visuals. Same reason auth.css/student.css stay global
// (documented cross-page borrows, worklog 8-b).
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/landing.css';
import './styles/auth.css';
import './styles/notifications.css';
import './styles/colleges.css';
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
