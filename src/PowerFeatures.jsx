import React, { useEffect, useMemo, useState } from 'react';
import { X, SlidersHorizontal, Download, Keyboard, Bell, Palette, Check, Volume2, ShieldCheck, Search } from 'lucide-react';

const THEMES = [
  { id: 'yellow', label: 'Solar yellow', color: '#facc15' },
  { id: 'purple', label: 'Nebula purple', color: '#a78bfa' },
  { id: 'cyan', label: 'Neon cyan', color: '#22d3ee' },
  { id: 'rose', label: 'Pulse rose', color: '#fb7185' },
  { id: 'green', label: 'Matrix green', color: '#4ade80' },
  { id: 'orange', label: 'Solar flare', color: '#fb923c' },
  { id: 'blue', label: 'Ocean blue', color: '#60a5fa' },
  { id: 'mint', label: 'Mint glow', color: '#34d399' },
  { id: 'white', label: 'Moonlight', color: '#e5e7eb' },
];
const defaults = { theme: 'yellow', density: 'comfortable', fontSize: 14, reducedMotion: false, enterToSend: true, notifications: false, sound: false, showBuddy: true, showTimestamps: true, showAvatars: true, showReactions: true, showEditedTags: true, showReplyPreviews: true, showAttachmentPreviews: true, showMessageTools: true, showComposerHint: true, showMessageBorders: true, fontFamily: 'system', lineHeight: 'normal', attachmentShape: 'rounded', underlineLinks: true };

function loadSettings(userId) {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('defchat:preferences:' + userId) || '{}') }; }
  catch { return defaults; }
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PowerFeatures({ open, onClose, userId, messages = [], conversationTitle = 'conversation', onOpenSearch, onToggleEmoji }) {
  const [settings, setSettings] = useState(() => loadSettings(userId));
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('appearance');
  const safeTitle = useMemo(() => String(conversationTitle || 'conversation').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').slice(0, 50) || 'conversation', [conversationTitle]);

  useEffect(() => { setSettings(loadSettings(userId)); }, [userId]);
  useEffect(() => {
    try { localStorage.setItem('defchat:preferences:' + userId, JSON.stringify(settings)); } catch {}
    const theme = THEMES.find(item => item.id === settings.theme) || THEMES[0];
    document.documentElement.style.setProperty('--dc-yellow', theme.color);
    document.documentElement.style.setProperty('--dc-accent', theme.color);
    document.documentElement.dataset.chatDensity = settings.density;
    document.documentElement.dataset.chatMotion = settings.reducedMotion ? 'reduced' : 'full';
    document.documentElement.style.setProperty('--dc-message-size', settings.fontSize + 'px');
    document.documentElement.dataset.showTimestamps = settings.showTimestamps ? 'true' : 'false';
    document.documentElement.dataset.showAvatars = settings.showAvatars ? 'true' : 'false';
    document.documentElement.dataset.showReactions = settings.showReactions ? 'true' : 'false';
    document.documentElement.dataset.showEditedTags = settings.showEditedTags ? 'true' : 'false';
    document.documentElement.dataset.showReplyPreviews = settings.showReplyPreviews ? 'true' : 'false';
    document.documentElement.dataset.showAttachmentPreviews = settings.showAttachmentPreviews ? 'true' : 'false';
    document.documentElement.dataset.showMessageTools = settings.showMessageTools ? 'true' : 'false';
    document.documentElement.dataset.showComposerHint = settings.showComposerHint ? 'true' : 'false';
    document.documentElement.dataset.showMessageBorders = settings.showMessageBorders ? 'true' : 'false';
    document.documentElement.dataset.fontFamily = settings.fontFamily;
    document.documentElement.dataset.messageLineHeight = settings.lineHeight;
    document.documentElement.dataset.attachmentShape = settings.attachmentShape;
    document.documentElement.dataset.underlineLinks = settings.underlineLinks ? 'true' : 'false';
  }, [settings, userId]);
  useEffect(() => {
    const handle = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); onOpenSearch?.();
      } else if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault(); window.dispatchEvent(new CustomEvent('defchat:open-power-settings'));
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault(); onToggleEmoji?.();
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault(); document.querySelector('.composer input:not([type=file])')?.focus();
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'b') { event.preventDefault(); window.dispatchEvent(new CustomEvent('defchat:open-saved-messages')); } else if (event.key === 'Escape' && open) onClose?.();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose, onOpenSearch, onToggleEmoji]);

  function change(key, value) { setSettings(current => ({ ...current, [key]: value })); if (key === 'showBuddy') window.dispatchEvent(new CustomEvent('defchat:buddy-visibility', { detail: { visible: value } })); setNotice('Preference saved on this device.'); }
  async function enableNotifications() {
    if (!('Notification' in window)) { setNotice('Notifications are not supported by this browser.'); return; }
    try {
      const permission = await Notification.requestPermission();
      change('notifications', permission === 'granted');
      setNotice(permission === 'granted' ? 'Browser notification permission enabled. New-message delivery still depends on the app being active.' : 'Browser notifications were not enabled.');
    } catch { setNotice('Could not request notification permission.'); }
  }
  function exportMessages(format) {
    const rows = messages.map(message => ({
      author: message.profiles?.username || 'member',
      createdAt: message.created_at || '',
      content: message.content || '',
      attachment: message.attachment_url || '',
      edited: Boolean(message.edited_at),
    }));
    if (format === 'json') downloadFile('defchat-' + safeTitle + '.json', JSON.stringify({ app: 'defchat', exportedAt: new Date().toISOString(), conversation: conversationTitle, messages: rows }, null, 2), 'application/json;charset=utf-8');
    if (format === 'txt') downloadFile('defchat-' + safeTitle + '.txt', rows.map(row => '[' + (row.createdAt ? new Date(row.createdAt).toLocaleString() : 'unknown time') + '] ' + row.author + ': ' + row.content + (row.attachment ? '\nAttachment: ' + row.attachment : '')).join('\n\n'), 'text/plain;charset=utf-8');
    if (format === 'csv') {
      const cell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
      const csv = [['Author', 'Created at', 'Message', 'Attachment', 'Edited'], ...rows.map(row => [row.author, row.createdAt, row.content, row.attachment, row.edited])].map(row => row.map(cell).join(',')).join('\r\n');
      downloadFile('defchat-' + safeTitle + '.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
    }
    setNotice('Your export is ready.');
  }

  if (!open) return null;
  return <div className="modal-backdrop power-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}>
    <section className="power-modal" role="dialog" aria-modal="true" aria-labelledby="power-title">
      <header className="power-heading"><span className="power-heading-icon"><SlidersHorizontal size={20}/></span><div><small>DEFGODQE / PERSONALIZE</small><h2 id="power-title">Power settings</h2><p>Your preferences, your workspace.</p></div><button className="modal-close" onClick={onClose} aria-label="Close settings"><X size={19}/></button></header>
      <div className="power-tabs">
        <button className={tab === 'appearance' ? 'active' : ''} onClick={() => setTab('appearance')}><Palette size={16}/> Appearance</button>
        <button className={tab === 'behavior' ? 'active' : ''} onClick={() => setTab('behavior')}><SlidersHorizontal size={16}/> Behavior</button>
        <button className={tab === 'export' ? 'active' : ''} onClick={() => setTab('export')}><Download size={16}/> Export data</button>
        <button className={tab === 'shortcuts' ? 'active' : ''} onClick={() => setTab('shortcuts')}><Keyboard size={16}/> Shortcuts</button>
      </div>
      <div className="power-body">
        {tab === 'appearance' && <>
          <div className="power-section-title"><h3>Accent color</h3><p>Choose a color for highlights and active controls.</p></div>
          <div className="power-themes">{THEMES.map(theme => <button key={theme.id} className={settings.theme === theme.id ? 'power-theme selected' : 'power-theme'} onClick={() => change('theme', theme.id)}><span style={{ background: theme.color }} />{theme.label}{settings.theme === theme.id && <Check size={15}/>}</button>)}</div>
          <div className="power-section-title"><h3>Chat density</h3><p>Choose how much space messages use.</p></div>
          <div className="power-segment"><button className={settings.density === 'comfortable' ? 'active' : ''} onClick={() => change('density', 'comfortable')}>Comfortable</button><button className={settings.density === 'compact' ? 'active' : ''} onClick={() => change('density', 'compact')}>Compact</button></div>
          <div className="power-setting"><div><b>Message text size</b><small>Adjust chat readability.</small></div><div className="power-size"><button onClick={() => change('fontSize', Math.max(12, settings.fontSize - 1))} aria-label="Decrease text size">−</button><strong>{settings.fontSize}px</strong><button onClick={() => change('fontSize', Math.min(18, settings.fontSize + 1))} aria-label="Increase text size">+</button></div></div>
          <Toggle label="Reduce animations" description="Use calmer transitions throughout the app." checked={settings.reducedMotion} onChange={value => change('reducedMotion', value)} />
          <Toggle label="Show message timestamps" description="Display the date and time beside each message." checked={settings.showTimestamps} onChange={value => change('showTimestamps', value)} />
          <Toggle label="Show message avatars" description="Show profile pictures next to chat messages." checked={settings.showAvatars} onChange={value => change('showAvatars', value)} />
          <Toggle label="Show quick reactions" description="Show the reaction row under channel messages." checked={settings.showReactions} onChange={value => change('showReactions', value)} />
          <Toggle label="Show edited labels" description="Hide the small edited marker after messages." checked={settings.showEditedTags} onChange={value => change('showEditedTags', value)} />
          <Toggle label="Show reply previews" description="Show the quoted message above a reply." checked={settings.showReplyPreviews} onChange={value => change('showReplyPreviews', value)} />
          <Toggle label="Show attachment previews" description="Show image previews in chat instead of links only." checked={settings.showAttachmentPreviews} onChange={value => change('showAttachmentPreviews', value)} />
          <Toggle label="Show message action buttons" description="Show save, reply, edit, and delete controls on messages." checked={settings.showMessageTools} onChange={value => change('showMessageTools', value)} />
          <Toggle label="Show composer tips" description="Show formatting hints below the message box." checked={settings.showComposerHint} onChange={value => change('showComposerHint', value)} />
          <Toggle label="Show subtle message borders" description="Add a light outline around chat messages." checked={settings.showMessageBorders} onChange={value => change('showMessageBorders', value)} />
          <div className="power-setting"><div><b>Chat font</b><small>Choose the typeface for message text.</small></div><div className="power-segment"><button className={settings.fontFamily === 'system' ? 'active' : ''} onClick={() => change('fontFamily', 'system')}>System</button><button className={settings.fontFamily === 'mono' ? 'active' : ''} onClick={() => change('fontFamily', 'mono')}>Mono</button></div></div>
          <div className="power-setting"><div><b>Message line spacing</b><small>Choose compact or relaxed reading.</small></div><div className="power-segment"><button className={settings.lineHeight === 'normal' ? 'active' : ''} onClick={() => change('lineHeight', 'normal')}>Normal</button><button className={settings.lineHeight === 'relaxed' ? 'active' : ''} onClick={() => change('lineHeight', 'relaxed')}>Relaxed</button></div></div>
          <div className="power-setting"><div><b>Attachment corners</b><small>Choose rounded or square image previews.</small></div><div className="power-segment"><button className={settings.attachmentShape === 'rounded' ? 'active' : ''} onClick={() => change('attachmentShape', 'rounded')}>Rounded</button><button className={settings.attachmentShape === 'square' ? 'active' : ''} onClick={() => change('attachmentShape', 'square')}>Square</button></div></div>
          <Toggle label="Underline links" description="Make clickable links stand out in messages." checked={settings.underlineLinks} onChange={value => change('underlineLinks', value)} />
        </>}
        {tab === 'behavior' && <>
          <div className="power-section-title"><h3>Chat behavior</h3><p>Fine-tune how messages are composed and alerts work.</p></div>
          <Toggle label="Show Buddy mascot" description="Turn Buddy on or off anywhere in defchat. You can change this any time." checked={settings.showBuddy} onChange={value => change('showBuddy', value)} />
          <Toggle label="Enter sends messages" description="When disabled, use the send button instead." checked={settings.enterToSend} onChange={value => change('enterToSend', value)} />
          <Toggle label="Enable message sound" description="Preference saved for future sound integrations." checked={settings.sound} onChange={value => change('sound', value)} icon={<Volume2 size={17}/>} />
          <div className="power-setting"><div><b>Browser notifications</b><small>Request permission for this site on this device.</small></div><button className="power-secondary" onClick={enableNotifications}><Bell size={15}/> {settings.notifications ? 'Enabled' : 'Enable'}</button></div>
          <div className="power-safe-note"><ShieldCheck size={17}/><span>These preferences are stored locally in this browser or desktop profile. They do not change server-wide settings.</span></div>
        </>}
        {tab === 'export' && <>
          <div className="power-section-title"><h3>Export current conversation</h3><p>Download the messages currently loaded in this view ({messages.length}). Exports are created on your device.</p></div>
          <div className="power-export-grid"><button onClick={() => exportMessages('json')}><Download size={18}/><b>JSON archive</b><small>Structured data and metadata</small></button><button onClick={() => exportMessages('txt')}><Download size={18}/><b>Plain text</b><small>Easy to read or share</small></button><button onClick={() => exportMessages('csv')}><Download size={18}/><b>CSV spreadsheet</b><small>Open in Excel or Sheets</small></button></div>
          <div className="power-safe-note"><ShieldCheck size={17}/><span>Only the messages currently loaded in the app are included. Attachments are linked, not downloaded. Export files may contain private conversations—store them carefully.</span></div>
        </>}
        {tab === 'shortcuts' && <>
          <div className="power-section-title"><h3>Keyboard shortcuts</h3><p>Jump around defchat without leaving the keyboard.</p></div>
          <div className="power-shortcuts">{[['Ctrl / ⌘ + K','Search messages'],['Ctrl / ⌘ + ,','Open power settings'],['Ctrl / ⌘ + Shift + M','Focus message composer'],['Ctrl / ⌘ + Shift + E','Open emoji picker'],['Ctrl / ⌘ + Shift + B','Open saved messages'],['Esc','Close the current settings dialog']].map(([keys, label]) => <div className="power-shortcut" key={keys}><span>{label}</span><kbd>{keys}</kbd></div>)}</div>
          <button className="power-secondary" onClick={() => { onClose?.(); onOpenSearch?.(); }}><Search size={16}/> Try message search</button>
        </>}
        {notice && <div className="power-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={13}/></button></div>}
      </div>
      <footer className="power-footer"><span>defchat · Personal workspace</span><button className="primary" onClick={onClose}>Done</button></footer>
    </section>
  </div>;
}

function Toggle({ label, description, checked, onChange, icon }) {
  return <div className="power-setting"><div className="power-setting-label">{icon}{<span><b>{label}</b><small>{description}</small></span>}</div><button type="button" className={checked ? 'power-toggle on' : 'power-toggle'} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><i/></button></div>;
}
