import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/stitch-tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/utilities.css';
import './styles/landing.css';
import './styles/premium.css';
import './styles/system.css';
import './styles/responsive.css';
import './styles/dashboard.css';
import './styles/interactions.css';
import './styles/notifications.css';
import './styles/polish.css';
import './styles/landing-auth-v3.css';
import './styles/stitch-canonical.css';
import './styles/redesign-landing.css';
import './styles/redesign-dashboard.css';
import './styles/redesign-lecture.css';
import './styles/redesign-matrix.css';
import './styles/redesign-global.css';
import './styles/pdf.css';
import './styles/owner.css';
import './styles/visual-final-polish.css';
import './styles/world-class.css';
import './styles/global-icon.css';
import './styles/madarek-final.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
