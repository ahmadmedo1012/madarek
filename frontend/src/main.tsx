import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/stitch-tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/utilities.css';
import './styles/landing.css';
import './styles/pdf.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
