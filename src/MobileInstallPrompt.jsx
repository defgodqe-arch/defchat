import React, { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true));
}

export default function MobileInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const dismissed = () => {
      try { return sessionStorage.getItem('cinder:install-dismissed') === '1'; }
      catch { return false; }
    };
    const iosDevice = isIOSDevice();
    setIos(iosDevice);
    if (isStandalone() || dismissed()) return;
    const beforeInstall = event => {
      event.preventDefault();
      setInstallPrompt(event);
      setVisible(true);
    };
    const installed = () => {
      setVisible(false);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    // iOS Safari doesn't dispatch beforeinstallprompt; provide the manual path.
    if (iosDevice && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent)) {
      setVisible(true);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowHelp(false);
    try { sessionStorage.setItem('cinder:install-dismissed', '1'); } catch {}
  };

  const install = async () => {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      // Browser controls whether installation is available.
    }
    setInstallPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <aside className="cinder-install-card" role="region" aria-label="Install Cinder">
      <div className="cinder-install-icon"><Smartphone size={21} /></div>
      <div className="cinder-install-copy">
        <strong>Take Cinder with you</strong>
        <span>{ios ? 'Add the app to your Home Screen for an app-like experience.' : 'Install Cinder for quick, app-like access.'}</span>
        {showHelp && (
          <p className="cinder-install-help">
            In Safari, tap <Share size={14} aria-label="Share" /> <b>Share</b>, then choose <b>Add to Home Screen</b> and tap <b>Add</b>.
          </p>
        )}
      </div>
      {ios ? (
        <button className="cinder-install-action" onClick={() => setShowHelp(value => !value)} aria-expanded={showHelp}>
          <Share size={15} /> How
        </button>
      ) : (
        <button className="cinder-install-action" onClick={install}>
          <Download size={15} /> Install
        </button>
      )}
      <button className="cinder-install-dismiss" onClick={dismiss} aria-label="Dismiss install suggestion"><X size={17} /></button>
    </aside>
  );
}
