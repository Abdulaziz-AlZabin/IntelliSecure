import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/welcome.css';
import './styles/welcome-enhanced.css';
import './styles/welcome-interactive.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/map.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);