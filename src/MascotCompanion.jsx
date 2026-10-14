import React,{useEffect,useMemo,useState} from 'react';
import {Sparkles,X,Heart,Gift,ChevronRight,Star,MessageCircle,Palette} from 'lucide-react';

const variants=[
 {id:'sunny',name:'Sunny',unlock:1,desc:'The original golden buddy',body:'#facc15',shadow:'#f59e0b',accent:'#fff1a8',eye:'#29251b',kind:'star'},
 {id:'berry',name:'Berry Pop',unlock:2,desc:'A sweet violet glow',body:'#b18cff',shadow:'#805ad5',accent:'#f0e5ff',eye:'#211a35',kind:'round'},
 {id:'aqua',name:'Bubblebyte',unlock:4,desc:'Fresh from the digital ocean',body:'#59e2e8',shadow:'#129eae',accent:'#d6ffff',eye:'#12363b',kind:'round'},
 {id:'ember',name:'Ember',unlock:6,desc:'Tiny creature, big energy',body:'#ff8b55',shadow:'#dc4c35',accent:'#ffe0b9',eye:'#3d2019',kind:'star'},
 {id:'moon',name:'Moonbeam',unlock:9,desc:'A little piece of the night sky',body:'#d5d9ee',shadow:'#8995bd',accent:'#fff',eye:'#292e4b',kind:'moon'},
 {id:'glitch',name:'Glitchling',unlock:12,desc:'Rare neon digital form',body:'#80ffb5',shadow:'#18a86a',accent:'#f2ff7c',eye:'#122b25',kind:'glitch'}
];
const accessories=[
 {id:'none',name:'No accessory',unlock:1,icon:'·'},
 {id:'halo',name:'Tiny halo',unlock:3,icon:'😇'},
 {id:'crown',name:'Pixel crown',unlock:5,icon:'👑'},
 {id:'flower',name:'Sunflower',unlock:7,icon:'🌼'},
 {id:'star',name:'Orbit stars',unlock:10,icon:'✨'},
 {id:'party',name:'Party hat',unlock:14,icon:'🎉'}
];
const xpForLevel=level=>Math.round(35*Math.pow(level,1.45));
function getLevel(xp){let level=1,total=0;while(level<99&&xp>=total+xpForLevel(level)){total+=xpForLevel(level);level++}return {level,into:xp-total,needed:xpForLevel(level),base:total}}
function load(userId){try{return JSON.parse(localStorage.getItem('defchat:mascot:'+userId)||'{}')}catch{return {}}}
function markSvg(size=36){return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="mascot-gold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0a0"/><stop offset=".55" stopColor="#facc15"/><stop offset="1" stopColor="#e89a08"/></linearGradient></defs><path d="M50 10 61 31 84 28 74 49 88 66 64 69 52 91 39 72 16 76 25 54 10 36 34 34Z" fill="url(#mascot-gold)" stroke="#eaa40a" strokeWidth="2.5" strokeLinejoin="round"/><ellipse cx="40" cy="49" rx="5" ry="7" fill="#29251b"/><ellipse cx="60" cy="49" rx="5" ry="7" fill="#29251b"/><path d="M41 62 Q50 70 59 62" fill="none" stroke="#29251b" strokeWidth="3.5" strokeLinecap="round"/><circle cx="74" cy="20" r="7" fill="#fff4b5" stroke="#facc15" strokeWidth="2"/></svg>}
function Buddy({variant='sunny',accessory='none',size=100,mood='happy',onClick,compact=false}) {
 const v=variants.find(x=>x.id===variant)||variants[0];
 return <button type="button" className={'mascot-buddy mascot-mood-'+mood+(compact?' mascot-compact':'')} style={{'--buddy-body':v.body,'--buddy-shadow':v.shadow,'--buddy-light':v.accent,'--buddy-eye':v.eye,width:size,height:size}} onClick={onClick} aria-label="Play with your defchat mascot">
  <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label={v.name}>
   <defs><linearGradient id={'body-'+v.id} x1="0" y1="0" x2="1" y2="1"><stop stopColor={v.accent}/><stop offset=".48" stopColor={v.body}/><stop offset="1" stopColor={v.shadow}/></linearGradient><filter id="buddy-glow"><feGaussianBlur stdDeviation="3"/></filter></defs>
   <ellipse cx="60" cy="103" rx="29" ry="7" fill={v.shadow} opacity=".22"/>
   {v.kind==='star'?<path d="M60 10 73 32 99 27 88 51 107 69 81 76 70 101 52 83 27 91 32 65 12 48 38 42Z" fill={v.shadow} opacity=".22" transform="translate(0 4)"/>:null}
   <g className="mascot-float">
    {v.kind==='moon'?<path d="M78 18 A43 43 0 1 0 99 78 A34 34 0 0 1 78 18Z" fill={'url(#body-'+v.id+')'} stroke={v.shadow} strokeWidth="2.5"/>:
     v.kind==='star'?<path d="M60 10 73 32 99 27 88 51 107 69 81 76 70 101 52 83 27 91 32 65 12 48 38 42Z" fill={'url(#body-'+v.id+')'} stroke={v.shadow} strokeWidth="2.5" strokeLinejoin="round"/>:
     v.kind==='glitch'?<path d="M29 23H78L94 39V79L77 96H30L17 79V38Z" fill={'url(#body-'+v.id+')'} stroke={v.shadow} strokeWidth="3"/>:
     <path d="M60 12 C85 12 103 30 103 57 C103 83 84 98 60 98 C35 98 17 82 17 57 C17 31 36 12 60 12Z" fill={'url(#body-'+v.id+')'} stroke={v.shadow} strokeWidth="2.5"/>}
    <path d="M45 17 Q41 5 54 7" fill="none" stroke={v.shadow} strokeWidth="4" strokeLinecap="round"/>
    <circle cx="55" cy="8" r="6" fill={v.accent} stroke={v.shadow} strokeWidth="2"/>
    <path d="M22 56 Q6 47 9 64 Q12 77 25 73" fill={v.body} stroke={v.shadow} strokeWidth="2.5"/>
    <path d="M97 57 Q114 46 112 63 Q110 76 96 73" fill={v.body} stroke={v.shadow} strokeWidth="2.5"/>
    <ellipse cx="44" cy="52" rx="6" ry={mood==='sleepy'?2:8} fill={v.eye}/><ellipse cx="75" cy="52" rx="6" ry={mood==='sleepy'?2:8} fill={v.eye}/>
    <circle cx="46" cy="49" r="2.2" fill="#fff"/><circle cx="77" cy="49" r="2.2" fill="#fff"/>
    {mood==='excited'?<path d="M45 66 Q60 87 76 66Z" fill={v.eye}/>:mood==='sleepy'?<path d="M50 67 Q60 73 70 67" fill="none" stroke={v.eye} strokeWidth="3.5" strokeLinecap="round"/>:<path d="M48 65 Q60 76 72 65" fill="none" stroke={v.eye} strokeWidth="3.5" strokeLinecap="round"/>}
    <ellipse cx="31" cy="62" rx="6" ry="3" fill="#ff8791" opacity=".65"/><ellipse cx="88" cy="62" rx="6" ry="3" fill="#ff8791" opacity=".65"/>
    {accessory==='halo'&&<ellipse cx="60" cy="9" rx="17" ry="5" fill="none" stroke="#fff2a8" strokeWidth="4"/>}
    {accessory==='crown'&&<path d="M38 21 34 8 48 16 60 3 72 16 87 8 81 24Z" fill="#ffdb57" stroke="#c18a17" strokeWidth="2" strokeLinejoin="round"/>}
    {accessory==='flower'&&<g transform="translate(85 26)"><circle cy="-6" r="5" fill="#ff8eb0"/><circle cx="6" cy="-1" r="5" fill="#ff8eb0"/><circle cx="4" cy="6" r="5" fill="#ff8eb0"/><circle cx="-4" cy="6" r="5" fill="#ff8eb0"/><circle cx="-6" cy="-1" r="5" fill="#ff8eb0"/><circle r="4" fill="#ffdc56"/></g>}
    {accessory==='star'&&<g fill="#fff1a8"><path d="M92 35l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="M27 28l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g>}
    {accessory==='party'&&<path d="M39 26 58 1 78 28Z" fill="#ff78ac" stroke="#b83c7b" strokeWidth="2"/ >}
   </g>
  </svg>
 </button>
}
export function MascotMark({size=36}){return <span className="mascot-mark">{markSvg(size)}</span>}
export default function MascotCompanion({userId,username='friend',onOpenCollection}) {
 const [data,setData]=useState(()=>load(userId||'guest'));
 const [open,setOpen]=useState(false),[mood,setMood]=useState('happy'),[toast,setToast]=useState('Your buddy is happy to see you!'),[lastTap,setLastTap]=useState(0);
 const current=getLevel(data.xp||0),v=variants.find(x=>x.id===data.variant)||variants[0],acc=accessories.find(x=>x.id===data.accessory)||accessories[0];
 const unlocked=useMemo(()=>variants.filter(x=>current.level>=x.unlock),[current.level]);
 function persist(next){setData(next);try{localStorage.setItem('defchat:mascot:'+(userId||'guest'),JSON.stringify(next))}catch{}}
 function award(amount,reason){setData(prev=>{const before=getLevel(prev.xp||0);const next={...prev,xp:(prev.xp||0)+amount};try{localStorage.setItem('defchat:mascot:'+(userId||'guest'),JSON.stringify(next))}catch{}const after=getLevel(next.xp);if(after.level>before.level){setToast('Level up! Your buddy reached level '+after.level+'!');setMood('excited')}else setToast(reason||'+'+amount+' buddy XP');return next})}
 useEffect(()=>{setData(load(userId||'guest'))},[userId]);
 useEffect(()=>{const onXp=e=>award(Math.max(1,Number(e.detail?.amount)||5),e.detail?.reason||'Your buddy earned XP!');window.addEventListener('defchat:mascot-xp',onXp);return()=>window.removeEventListener('defchat:mascot-xp',onXp)},[userId]);
 function pet(){const now=Date.now();setOpen(true);if(now-lastTap>15000){setLastTap(now);award(1,'Your buddy loved that! +1 XP')}setMood('excited');setTimeout(()=>setMood('happy'),1200)}
 function equipVariant(id){if(current.level<(variants.find(x=>x.id===id)?.unlock||99))return;persist({...data,variant:id});setToast('Your buddy changed form!')}
 function equipAccessory(id){if(current.level<(accessories.find(x=>x.id===id)?.unlock||99))return;persist({...data,accessory:id});setToast('Accessory equipped!')}
 if(!userId)return null;
 return <div className="mascot-dock">
  {open&&<section className="mascot-panel" role="dialog" aria-label="Your defchat mascot">
   <div className="mascot-panel-head"><div><span className="mascot-eyebrow"><Sparkles size={12}/> YOUR LITTLE COMPANION</span><h3>{v.name} <span>Lv. {current.level}</span></h3></div><button type="button" className="mascot-close" onClick={()=>setOpen(false)} aria-label="Close mascot panel"><X size={17}/></button></div>
   <div className="mascot-stage"><div className="mascot-stage-glow"/><Buddy variant={v.id} accessory={acc.id} size={136} mood={mood} onClick={pet}/><span className="mascot-level-pill"><Star size={12} fill="currentColor"/> LEVEL {current.level}</span></div>
   <div className="mascot-progress"><div className="mascot-progress-meta"><span>{data.xp||0} total XP</span><b>{current.into}/{current.needed} XP</b></div><div className="mascot-progress-track"><i style={{width:(current.into/current.needed*100)+'%'}}/></div><small>{current.needed-current.into} XP to level {current.level+1}</small></div>
   <div className="mascot-toast" role="status">{toast}</div>
   <div className="mascot-action-row"><button type="button" onClick={pet}><Heart size={15} fill="currentColor"/> Pet buddy <small>+1 XP / 15s</small></button><button type="button" onClick={()=>{setMood('sleepy');setToast('Shhh… '+v.name+' is taking a tiny nap.')}}>Nap <span>☾</span></button></div>
   <div className="mascot-collection-title"><span><Palette size={14}/> Forms & cosmetics</span><small>{unlocked.length}/{variants.length} forms</small></div>
   <div className="mascot-variants">{variants.map(item=><button type="button" key={item.id} disabled={current.level<item.unlock} className={'mascot-variant '+(data.variant===item.id?'is-equipped':'')+(current.level<item.unlock?' is-locked':'')} onClick={()=>equipVariant(item.id)} title={current.level<item.unlock?'Unlock at level '+item.unlock:item.name}><span className="mascot-variant-art" style={{'--buddy-body':item.body,'--buddy-shadow':item.shadow}}><Buddy variant={item.id} size={48}/>{current.level<item.unlock&&<i>🔒</i>}</span><b>{item.name}</b><small>{current.level<item.unlock?'Lv. '+item.unlock:'Tap to equip'}</small></button>)}</div>
   <div className="mascot-collection-title"><span><Gift size={14}/> Accessories</span><small>{accessories.filter(x=>current.level>=x.unlock).length}/{accessories.length} unlocked</small></div>
   <div className="mascot-accessories">{accessories.map(item=><button type="button" key={item.id} disabled={current.level<item.unlock} className={(data.accessory===item.id?'is-equipped ':'')+(current.level<item.unlock?'is-locked':'')} onClick={()=>equipAccessory(item.id)} title={current.level<item.unlock?'Unlock at level '+item.unlock:item.name}><span>{item.icon}</span><small>{item.name}</small></button>)}</div>
   <div className="mascot-panel-foot"><MessageCircle size={13}/> Chat to earn XP · every message helps your buddy grow.</div>
  </section>}
  <button type="button" className={'mascot-launcher '+(open?'is-open':'')} onClick={()=>setOpen(x=>!x)} aria-label={open?'Close your mascot':'Open your mascot'} title="Meet your defchat mascot"><span className="mascot-launcher-spark"><Sparkles size={13}/></span><Buddy variant={v.id} accessory={acc.id} size={60} mood={mood} compact/><span className="mascot-launcher-level">{current.level}</span></button>
 </div>
}
