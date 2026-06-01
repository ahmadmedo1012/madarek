import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/landing.css';
import './styles/auth.css';
import './styles/notifications.css';
import './styles/pdf.css';
import './styles/owner.css';
import './styles/colleges.css';
import './styles/polish-v6.css';
import './styles/polish-v7.css';
import './styles/polish-v8.css';
import './styles/polish-v9.css';
import './styles/polish-v10.css';
import './styles/polish-v11.css';
import './styles/polish-v12.css';
import './styles/polish-v13.css';
import './styles/polish-v14.css';
import './styles/polish-v15.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
