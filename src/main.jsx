import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import MobileInstallPrompt from './MobileInstallPrompt.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('defchat encountered a rendering error:', error, info?.componentStack || '');
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#313338', color: '#f2f3f5', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ width: 'min(100%, 420px)', padding: 24, border: '1px solid #484b54', borderRadius: 16, background: '#232428', textAlign: 'center' }}>
            <h1 style={{ marginTop: 0, fontSize: 22 }}>defchat hit a snag</h1>
            <p style={{ color: '#b5bac1', lineHeight: 1.6 }}>This screen ran into an unexpected error. Your account data is not intentionally cleared. Reload defchat to try again.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 42, padding: '0 18px', border: 0, borderRadius: 9, background: '#ffc83d', color: '#17130b', fontWeight: 700 }}>Reload defchat</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary><App /><MobileInstallPrompt /></AppErrorBoundary>
  </React.StrictMode>
);

// Mobile installable-web-app support. Packaged Electron uses local files instead.
if ('serviceWorker' in navigator && !window.location.protocol.startsWith('file:')) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/';
    navigator.serviceWorker.register(new URL('sw.js', new URL(base, window.location.href))).catch(() => {});
  });
}
