import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Madarek visual system — full rebuild from Madarik AI design reference.
 *
 * Load order (single source of truth):
 *   tokens.css  — design tokens (colors, spacing, type, motion)
 *   app.css     — comprehensive component + page system
 *   pdf.css     — PDF viewer chrome (functional, theme-aware)
 *
 * Legacy files (landing, landing-auth-v3, dashboard, owner,
 * redesign-lecture, redesign-matrix) have been intentionally
 * emptied — their selectors are now consolidated in app.css. */
import './styles/tokens.css';
import './styles/app.css';
import './styles/pdf.css';
/* refined-blue.css MUST load last — calm blue-centered palette,
 * premium motion, and subtle hand-drawn accents layered on top of
 * the existing system. Purely additive overrides. */
import './styles/refined-blue.css';
/* final-coherence.css — last layer for visual/interaction unification:
 * typography lockdown, mobile tab scroll, button/form parity, list-row
 * & feed-item polish, sidebar/topbar cohesion, modal & state harmony,
 * and a final defensive mobile pass. Strictly additive. */
import './styles/final-coherence.css';
/* dashboard-intel.css — companion stylesheet for the chart toolkit in
 * lib/charts.tsx (RadialProgress, HeatmapWeeks, StatTrend, TrendChip,
 * AnimatedCounter caret, donut center slot, intel grid layouts). */
import './styles/dashboard-intel.css';
/* mobile-stabilize.css — final defensive pass: visible sidebar close
 * button, mobile drawer rhythm, row-clipping fixes for run-row /
 * list-row / job card / alert, chart heights step-down on phones,
 * topbar touch targets, page-header column-stack on mobile. */
import './styles/mobile-stabilize.css';
/* premium-polish.css — elite-level final pass: typography contrast,
 * button clarity, card unified rhythm, sidebar/topbar polish, focus
 * ring consolidation, badge/pill polish, scrollbar refinement, and
 * page-title-icon slot for the new dashboard greeting. Strictly
 * additive; loaded last so it has the final word on visual quality. */
import './styles/premium-polish.css';
/* final-stabilize.css — definitive z-index scale, dropdown layering
 * fix (topbar bumped 30 -> 50, dropdowns -> 80 to escape every card
 * stacking context), smooth content reveal staggers, chart fade-in,
 * skeleton crossfade, and reduced-motion safety. */
import './styles/final-stabilize.css';
/* final-interaction.css — profile menu viewport-safe positioning,
 * theme switch crossfade (background-color + border-color transition),
 * bottom nav glass polish + active indicator, button text clarity
 * (white text-shadow on primary), tab/page navigation smoothness. */
import './styles/final-interaction.css';

import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
