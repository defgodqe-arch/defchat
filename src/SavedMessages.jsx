import React, { useMemo, useState } from 'react';
import { Bookmark, Copy, Download, Search, Trash2, X, ExternalLink, Check } from 'lucide-react';

export default function SavedMessages({ open, onClose, items = [], onRemove }) {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');
  const filtered = useMemo(() => items.filter(item => [item.content, item.author, item.conversation].some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase()))).sort((a,b) => (b.savedAt || 0) - (a.savedAt || 0)), [items, query]);
  if (!open) return null;
  const copy = async item => {
    try { await navigator.clipboard.writeText(item.content || item.attachment_url || ''); setCopied(item.key); window.setTimeout(() => setCopied(''), 1500); }
    catch { setCopied(''); }
  };
  const exportItems = () => {
    const blob = new Blob([JSON.stringify({ app: 'defchat', exportedAt: new Date().toISOString(), savedMessages: filtered }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'defchat-saved-messages.json'; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="modal-backdrop saved-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}>
    <section className="saved-modal" role="dialog" aria-modal="true" aria-labelledby="saved-title">
      <header className="saved-heading"><div className="saved-mark"><Bookmark size={21}/></div><div className="saved-heading-copy"><h2 id="saved-title">Saved messages</h2><p>Your personal collection · {items.length} saved</p></div><button className="modal-close" onClick={onClose} aria-label="Close saved messages"><X size={19}/></button></header>
      <div className="saved-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your saved messages…"/><button onClick={exportItems} disabled={!filtered.length} title="Export saved messages"><Download size={16}/></button></div>
      <div className="saved-list">{filtered.map(item => <article className="saved-item" key={item.key}><div className="saved-item-top"><span className="saved-location">{item.conversation || 'Conversation'}</span><time>{item.createdAt ? new Date(item.createdAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'Saved item'}</time></div><b className="saved-author">{item.author || 'Member'}</b>{item.content && <p>{item.content}</p>}{item.attachment_url && <a className="saved-attachment" href={item.attachment_url} target="_blank" rel="noreferrer"><ExternalLink size={14}/>{item.attachment_name || 'Open attachment'}</a>}<div className="saved-item-actions"><button onClick={() => copy(item)}>{copied === item.key ? <Check size={14}/> : <Copy size={14}/>} {copied === item.key ? 'Copied' : 'Copy message'}</button><button className="saved-remove" onClick={() => onRemove?.(item.key)}><Trash2 size={14}/> Remove</button></div></article>)}{!filtered.length&&<div className="saved-empty"><div><Bookmark size={24}/></div><b>{query ? 'No saved messages match' : 'Keep the good stuff'}</b><p>{query ? 'Try another search.' : 'Use the bookmark icon on any message to save it here for later.'}</p></div>}</div>
      <footer className="saved-footer"><span>Saved privately on this device</span><button className="primary" onClick={onClose}>Done</button></footer>
    </section>
  </div>;
}
