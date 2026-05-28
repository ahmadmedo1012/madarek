import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Design system v5 — clean rebuild.
// tokens.css supplies design tokens; app.css contains the entire
// component+layout+page system. pdf.css is kept separate (PDF viewer
// chunk-loaded). All previous overlapping layers have been removed.
import './styles/tokens.css';
import './styles/app.css';
import './styles/owner.css';
import './styles/pdf.css';

import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
