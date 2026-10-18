import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import MobileInstallPrompt from './MobileInstallPrompt.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /><MobileInstallPrompt /></React.StrictMode>
);

// Mobile installable-web-app support. Packaged Electron uses local files instead.
if ('serviceWorker' in navigator && !window.location.protocol.startsWith('file:')) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/';
    navigator.serviceWorker.register(new URL('sw.js', new URL(base, window.location.href))).catch(() => {});
  });
}
