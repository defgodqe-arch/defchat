import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Command,Search,ArrowUp,ArrowDown,CornerDownLeft, X} from 'lucide-react';

export default function QuickActions({open,onClose,actions=[]}) {
  const [query,setQuery]=useState('');
  const [active,setActive]=useState(0);
  const inputRef=useRef(null);
  const filteredRef=useRef(filtered);
  const activeRef=useRef(active);
  const closeRef=useRef(onClose);
  filteredRef.current=filtered;
  activeRef.current=active;
  closeRef.current=onClose;
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return actions.filter(action=>!q||[action.label,action.description,action.group].filter(Boolean).join(' ').toLowerCase().includes(q));
  },[actions,query]);
  useEffect(()=>{
    if(!open)return;
    setQuery('');
    setActive(0);
    const id=window.setTimeout(()=>inputRef.current?.focus(),30);
    const onKeyDown=e=>{
      if(e.key==='Escape'){e.preventDefault();closeRef.current?.()}
      if(e.key==='ArrowDown'){e.preventDefault();setActive(v=>filteredRef.current.length?(v+1)%filteredRef.current.length:0)}
      if(e.key==='ArrowUp'){e.preventDefault();setActive(v=>filteredRef.current.length?(v-1+filteredRef.current.length)%filteredRef.current.length:0)}
      if(e.key==='Enter'&&filteredRef.current[activeRef.current]){e.preventDefault();filteredRef.current[activeRef.current].run?.();closeRef.current?.()}
    };
    window.addEventListener('keydown',onKeyDown);
    return()=>{window.clearTimeout(id);window.removeEventListener('keydown',onKeyDown)};
  },[open]);
  useEffect(()=>{setActive(0)},[query]);
  if(!open)return null;
  return <div className="quick-actions-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose?.()}}>
    <section className="quick-actions-panel" role="dialog" aria-modal="true" aria-label="Quick actions">
      <div className="quick-actions-search"><Command size={19}/><input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Where do you want to go?" aria-label="Search quick actions"/><kbd>ESC</kbd><button type="button" onClick={onClose} aria-label="Close quick actions"><X size={17}/></button></div>
      <div className="quick-actions-caption">{query?'MATCHING ACTIONS':'JUMP BACK IN'}</div>
      <div className="quick-actions-list">
        {filtered.length?filtered.map((action,index)=><button type="button" key={action.id} className={'quick-actions-item'+(index===active?' is-active':'')} onMouseEnter={()=>setActive(index)} onClick={()=>{action.run?.();onClose?.()}}>
          <span className="quick-actions-icon">{action.icon||<Search size={17}/>}</span><span className="quick-actions-copy"><b>{action.label}</b><small>{action.description||action.group||'Quick action'}</small></span><span className="quick-actions-enter"><CornerDownLeft size={14}/></span>
        </button>):<div className="quick-actions-empty"><Search size={22}/><b>No actions found</b><span>Try a different search.</span></div>}
      </div>
      <footer className="quick-actions-footer"><span><kbd><ArrowUp size={11}/></kbd><kbd><ArrowDown size={11}/></kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>ESC</kbd> Close</span></footer>
    </section>
  </div>;
}
