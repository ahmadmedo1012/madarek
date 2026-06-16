import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/landing.css';
import './styles/auth.css';
import './styles/notifications.css';
import './styles/pdf.css';
import './styles/owner.css';
import './styles/colleges.css';
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
