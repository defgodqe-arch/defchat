import React, { useState } from 'react';
import { Search, Globe2, Users, MessageSquare, Hash, Server, ArrowUpRight, LoaderCircle, X, ExternalLink, Sparkles } from 'lucide-react';
import './SearchHub.css';

const AI_API = (import.meta.env.VITE_DEFGODQE_AI_API || 'https://ai.defgodqe.workers.dev').replace(/\/+$/, '');
const TABS = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'people', label: 'People', icon: Users },
  { id: 'spaces', label: 'Servers & channels', icon: Hash },
  { id: 'web', label: 'AI web search', icon: Globe2 },
];
const cleanQuery = value => String(value || '').trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ').slice(0, 180);
const includes = (value, query) => String(value || '').toLowerCase().includes(query.toLowerCase());

export default function SearchHub({ db, user, servers = [], dmList = [], onClose, onOpenProfile, onOpenDM, onOpenChannel }) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [results, setResults] = useState({ people: [], messages: [], spaces: [] });
  const [webResult, setWebResult] = useState(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function runSearch(value = query) {
    const q = cleanQuery(value);
    if (!q) { setError('Type something to search for.'); return; }
    setQuery(q); setError(''); setLoading(true); setSearched(true); setWebResult(null);
    try {
      const pattern = '%' + q + '%';
      const serverIds = [...new Set(servers.map(s => s.id).filter(Boolean))];
      const conversationIds = [...new Set(dmList.map(d => d.id).filter(Boolean))];
      const [peopleResponse, channelResponse] = await Promise.all([
        db.from('profiles').select('id,username,avatar_url,bio,status').or('username.ilike.' + pattern + ',bio.ilike.' + pattern).neq('id', user.id).order('username').limit(10),
        serverIds.length ? db.from('channels').select('id,name,server_id,topic').in('server_id', serverIds).order('name').limit(500) : Promise.resolve({ data: [], error: null }),
      ]);
      if (peopleResponse.error) throw peopleResponse.error;
      const people = (peopleResponse.data || []).map(person => ({ ...person, type: 'person', title: '@' + person.username, subtitle: person.bio || 'Defchat member' }));
      const channels = channelResponse.data || [];
      const matchingChannels = channels.filter(c => includes(c.name, q) || includes(c.topic, q)).map(c => ({ ...c, type: 'channel', title: '#' + c.name, subtitle: servers.find(s => s.id === c.server_id)?.name || 'Server channel' }));
      const matchingServers = servers.filter(s => includes(s.name, q) || includes(s.description, q)).map(s => ({ ...s, type: 'server', title: s.name, subtitle: 'Server' }));
      const channelIds = channels.map(c => c.id).filter(Boolean);
      const [channelMessagesResponse, dmMessagesResponse] = await Promise.all([
        channelIds.length ? db.from('messages').select('id,content,created_at,user_id,channel_id,attachment_url').in('channel_id', channelIds).ilike('content', pattern).order('created_at', { ascending: false }).limit(12) : Promise.resolve({ data: [], error: null }),
        conversationIds.length ? db.from('dm_messages').select('id,content,created_at,user_id,conversation_id,attachment_url').in('conversation_id', conversationIds).ilike('content', pattern).order('created_at', { ascending: false }).limit(12) : Promise.resolve({ data: [], error: null }),
      ]);
      if (channelMessagesResponse.error && dmMessagesResponse.error) throw channelMessagesResponse.error;
      const rawMessages = [
        ...(channelMessagesResponse.data || []).map(m => ({ ...m, source: 'channel' })),
        ...(dmMessagesResponse.data || []).map(m => ({ ...m, source: 'dm' })),
      ].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 20);
      const authorIds = [...new Set(rawMessages.map(m => m.user_id).filter(Boolean))];
      const authorResponse = authorIds.length ? await db.from('profiles').select('id,username,avatar_url').in('id', authorIds) : { data: [], error: null };
      const authors = Object.fromEntries((authorResponse.data || []).map(p => [p.id, p]));
      const messageResults = rawMessages.map(m => {
        const channel = channels.find(c => c.id === m.channel_id);
        const dm = dmList.find(d => d.id === m.conversation_id);
        return { ...m, type: 'message', author: authors[m.user_id]?.username || 'member', title: m.source === 'dm' ? 'DM · ' + (dm?.username || dm?.name || 'Conversation') : '#' + (channel?.name || 'channel'), subtitle: (authors[m.user_id]?.username || 'member') + ' · ' + (m.created_at ? new Date(m.created_at).toLocaleString() : 'Message') };
      });
      setResults({ people, messages: messageResults, spaces: [...matchingServers, ...matchingChannels] });
    } catch (e) {
      setError(e?.message || 'Search failed. Please try again.');
      setResults({ people: [], messages: [], spaces: [] });
    } finally { setLoading(false); }
  }

  async function runWebSearch() {
    const q = cleanQuery(query);
    if (!q) { setError('Type a question or topic to search the web.'); return; }
    setQuery(q); setError(''); setTab('web'); setWebLoading(true); setWebResult(null); setSearched(true);
    try {
      const response = await fetch(AI_API + '/web-search', { method: 'POST', headers: { 'content-type': 'application/json', 'X-Defgodqe-Client': 'defchat-web' }, body: JSON.stringify({ query: q }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.response) throw new Error(data.error || 'AI web search is unavailable. Please try again.');
      setWebResult({ response: String(data.response), sources: Array.isArray(data.sources) ? data.sources : [] });
    } catch (e) { setError(e?.message || 'Could not connect to AI web search.'); }
    finally { setWebLoading(false); }
  }

  function activate(item) {
    if (item.type === 'person') { onClose?.(); onOpenProfile?.(item.id); return; }
    if (item.type === 'message') {
      onClose?.();
      if (item.source === 'dm') { const dm = dmList.find(d => d.id === item.conversation_id); if (dm) onOpenDM?.(dm); }
      else onOpenChannel?.(item);
      return;
    }
    onClose?.();
    if (item.type === 'channel') onOpenChannel?.(item);
    else if (item.type === 'server') onOpenChannel?.({ id: item.id, server_id: item.id });
  }

  const visiblePeople = tab === 'all' || tab === 'people';
  const visibleMessages = tab === 'all' || tab === 'messages';
  const visibleSpaces = tab === 'all' || tab === 'spaces';
  const count = (visiblePeople ? results.people.length : 0) + (visibleMessages ? results.messages.length : 0) + (visibleSpaces ? results.spaces.length : 0);
  function ResultRow({ item, icon: Icon }) {
    return <button type="button" className="searchhub-result" onClick={() => activate(item)}>
      <span className="searchhub-result-icon"><Icon size={17}/></span>
      <span className="searchhub-result-copy"><strong>{item.title}</strong><small>{item.subtitle}</small>{item.type === 'message' && <span className="searchhub-result-snippet">{item.content || 'Attachment'}</span>}</span>
      <ArrowUpRight size={15} className="searchhub-result-arrow"/>
    </button>;
  }

  return <div className="searchhub-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}>
    <section className="searchhub" role="dialog" aria-modal="true" aria-label="Search defchat">
      <header className="searchhub-header"><div className="searchhub-title"><span><Search size={20}/></span><div><strong>Search defchat</strong><small>Find people, messages, servers, and web answers</small></div></div><button type="button" className="searchhub-close" onClick={onClose} aria-label="Close search"><X size={19}/></button></header>
      <form className="searchhub-form" onSubmit={event => { event.preventDefault(); if (tab === 'web') runWebSearch(); else runSearch(); }}>
        <Search size={19}/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search messages, people, servers, or ask the web…" aria-label="Search defchat" maxLength={180}/>
        <button type="submit" disabled={loading || webLoading || !query.trim()}>{tab === 'web' ? 'Search web' : 'Search'}</button>
      </form>
      <nav className="searchhub-tabs" aria-label="Search categories">{TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => { setTab(id); setError(''); if (id === 'web' && query.trim() && !webResult) void runWebSearch(); }}>{<Icon size={15}/>}<span>{label}</span></button>)}</nav>
      {tab === 'web' ? <div className="searchhub-body">
        {webLoading && <div className="searchhub-state"><LoaderCircle className="spin" size={23}/><strong>Searching the web with AI…</strong><span>Results and summaries stay in defchat.</span></div>}
        {!webLoading && webResult && <div className="searchhub-web-answer"><div className="searchhub-answer-label"><Sparkles size={15}/> AI summary</div><div className="searchhub-answer-text">{webResult.response}</div>{webResult.sources.length > 0 && <div className="searchhub-source-list"><strong>Sources</strong>{webResult.sources.map((source, index) => <a key={source.url || index} href={source.url} target="_blank" rel="noopener noreferrer"><span><b>{source.title || source.domain || source.url}</b><small>{source.domain || source.url}</small></span><ExternalLink size={14}/></a>)}</div>}</div>}
        {!webLoading && !webResult && !error && <div className="searchhub-state"><Globe2 size={25}/><strong>Ask the web</strong><span>Get an AI-generated answer with sources, without leaving defchat.</span></div>}
      </div> : <div className="searchhub-body">
        {loading && <div className="searchhub-state"><LoaderCircle className="spin" size={23}/><strong>Searching defchat…</strong><span>Looking through content you can access.</span></div>}
        {!loading && searched && count === 0 && !error && <div className="searchhub-state"><Search size={25}/><strong>No results found</strong><span>Try another keyword or switch to AI web search.</span><button type="button" onClick={runWebSearch}>Search the web instead</button></div>}
        {!loading && !searched && <div className="searchhub-state"><Search size={25}/><strong>Search across defchat</strong><span>Find people, server channels, recent messages, and direct messages you can access.</span></div>}
        {!loading && visiblePeople && results.people.length > 0 && <section className="searchhub-group"><h3><Users size={15}/> People <span>{results.people.length}</span></h3>{results.people.map(item => <ResultRow key={item.id} item={item} icon={Users}/>)}</section>}
        {!loading && visibleMessages && results.messages.length > 0 && <section className="searchhub-group"><h3><MessageSquare size={15}/> Messages <span>{results.messages.length}</span></h3>{results.messages.map(item => <ResultRow key={item.source + '-' + item.id} item={item} icon={MessageSquare}/>)}</section>}
        {!loading && visibleSpaces && results.spaces.length > 0 && <section className="searchhub-group"><h3><Server size={15}/> Servers & channels <span>{results.spaces.length}</span></h3>{results.spaces.map(item => <ResultRow key={item.type + '-' + item.id} item={item} icon={item.type === 'server' ? Server : Hash}/>)}</section>}
      </div>}
      {error && <div className="searchhub-error" role="alert">{error}</div>}
      <footer className="searchhub-footer"><span><kbd>Enter</kbd> to search</span><span>Search results respect your defchat access permissions</span></footer>
    </section>
  </div>;
}
