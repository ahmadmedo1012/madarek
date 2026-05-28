import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Design system v5 — clean rebuild.
// Load order:
//   tokens.css       — design tokens (single source of truth)
//   page-specifics   — load BEFORE app.css so app.css overrides them on
//                      overlapping selectors but specific classes (e.g.
//                      .dash-agenda-item, .landing-hero-float-card)
//                      that aren't in app.css still resolve
//   app.css          — comprehensive component+layout system
//   owner.css        — owner-panel-specific rules
//   pdf.css          — PDF viewer chunk-loaded
import './styles/tokens.css';
import './styles/dashboard.css';
import './styles/landing.css';
import './styles/landing-auth-v3.css';
import './styles/redesign-lecture.css';
import './styles/redesign-matrix.css';
import './styles/owner.css';
import './styles/app.css';
import './styles/pdf.css';

import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
