import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/reset.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/utilities.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/landing.css';
import './styles/responsive.css';
import './styles/theme-dark.css';
import './styles/theme-light.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
