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
 const face=v.kind==='moon'?'moon':v.kind==='glitch'?'glitch':'creature';
 const bodyFill='url(#buddy-coat-'+v.id+')';
 return <div className={'mascot-buddy mascot-mood-'+mood+(compact?' mascot-compact':'')} style={{'--buddy-body':v.body,'--buddy-shadow':v.shadow,'--buddy-light':v.accent,'--buddy-eye':v.eye,width:size,height:size}} onClick={onClick} role={onClick?'button':'img'} tabIndex={onClick?0:undefined} onKeyDown={onClick?e=>{if(e.key==='Enter'||e.key===' ')onClick()}:undefined} aria-label={'Play with your defchat mascot: '+v.name}>
  <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label={v.name}>
   <defs>
    <linearGradient id={'buddy-coat-'+v.id} x1="0" y1="0" x2=".85" y2="1"><stop stopColor={v.accent}/><stop offset=".42" stopColor={v.body}/><stop offset="1" stopColor={v.shadow}/></linearGradient>
    <linearGradient id={'buddy-belly-'+v.id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff9e8"/><stop offset="1" stopColor="#f0dfbd"/></linearGradient>
   </defs>
   <ellipse cx="60" cy="105" rx="25" ry="5.5" fill="#171717" opacity=".12"/>
   <g className="mascot-float">
    {face==='moon'?<path d="M77 14C53 14 35 33 35 57c0 24 18 42 42 42 11 0 21-4 29-12-22 2-39-15-39-36 0-15 8-28 21-34-4-2-7-3-11-3Z" fill={bodyFill} stroke={v.shadow} strokeWidth="2.6" strokeLinejoin="round"/>:
    face==='glitch'?<path d="M36 18h37l9 10h9v14l8 8v28l-14 3-8 13H39l-5-12-10-4V39l12-4Z" fill={bodyFill} stroke={v.shadow} strokeWidth="2.6" strokeLinejoin="round"/>:
    <g>
     <path d="M30 45 25 21Q24 16 29 20L48 36Q60 31 72 36L91 20Q96 16 95 23L91 47Q101 59 96 78 88 99 61 100 34 100 24 80 17 62 30 45Z" fill={v.shadow} opacity=".24" transform="translate(0 3)"/>
     <path d="M30 43 25 19Q24 14 29 19L49 36Q60 31 72 36L92 19Q97 15 95 23L91 46Q102 59 96 78 88 98 61 99 34 99 24 79 17 61 30 43Z" fill={bodyFill} stroke={v.shadow} strokeWidth="2.6" strokeLinejoin="round"/>
     <path d="M31 28 31 39 43 36Z" fill={v.accent} opacity=".9"/><path d="M89 28 88 39 77 36Z" fill={v.accent} opacity=".9"/>
     <path d="M42 77Q60 88 79 77 75 94 60 94 46 94 42 77Z" fill={'url(#buddy-belly-'+v.id+')'} opacity=".92"/>
    </g>}
    {face==='moon'?<g/>:<g>
     <path d="M43 42Q49 37 54 43" fill="none" stroke={v.shadow} strokeWidth="2.5" strokeLinecap="round"/>
     <path d="M68 43Q74 37 80 42" fill="none" stroke={v.shadow} strokeWidth="2.5" strokeLinecap="round"/>
     <ellipse cx="48" cy="53" rx="5.2" ry={mood==='sleepy'?1.8:7} fill={v.eye}/>
     <ellipse cx="74" cy="53" rx="5.2" ry={mood==='sleepy'?1.8:7} fill={v.eye}/>
     {mood!=='sleepy'&&<g fill="#fff"><circle cx="49.5" cy="50.5" r="2"/><circle cx="75.5" cy="50.5" r="2"/></g>}
     <path d={mood==='excited'?'M50 65Q61 81 73 65Q69 78 61 78Q53 78 50 65Z':'M51 66Q61 74 71 66'} fill={mood==='excited'?v.eye:'none'} stroke={v.eye} strokeWidth="2.8" strokeLinecap="round"/>
     <path d="M30 63q5-4 10 0M81 63q5-4 10 0" fill="none" stroke="#d96d68" strokeWidth="3.5" strokeLinecap="round" opacity=".65"/>
     <path d="M59 58l3 2-3 2-3-2Z" fill={v.shadow} opacity=".85"/>
    </g>}
    {face==='moon'&&<g><circle cx="65" cy="55" r="3.5" fill={v.eye}/><path d="M63 66q6 5 12 0" fill="none" stroke={v.eye} strokeWidth="2.5" strokeLinecap="round"/><circle cx="84" cy="38" r="2" fill={v.accent}/></g>}
    {face==='glitch'&&<g><path d="M42 46h12v12H42zM68 46h12v12H68z" fill={v.eye}/><path d="M48 72h23" stroke={v.eye} strokeWidth="3" strokeLinecap="square"/><path d="M20 50h8M93 67h8M33 87h8" stroke={v.accent} strokeWidth="3" strokeLinecap="square"/></g>}
    {accessory==='halo'&&<ellipse cx="60" cy="13" rx="15" ry="4.5" fill="none" stroke="#fff4c5" strokeWidth="3.5"/>}
    {accessory==='crown'&&<path d="M39 27 35 12 48 20 60 6 72 20 86 12 81 29Z" fill="#f5c94e" stroke="#9e711b" strokeWidth="2" strokeLinejoin="round"/>}
    {accessory==='flower'&&<g transform="translate(88 30)" stroke="#a56b38" strokeWidth="1"><circle cy="-5" r="4.5" fill="#ff91ad"/><circle cx="5" cy="-1" r="4.5" fill="#ff91ad"/><circle cx="3" cy="5" r="4.5" fill="#ff91ad"/><circle cx="-3" cy="5" r="4.5" fill="#ff91ad"/><circle cx="-5" cy="-1" r="4.5" fill="#ff91ad"/><circle r="3.5" fill="#f7d35a"/></g>}
    {accessory==='star'&&<g fill="#fff0a1" stroke="#d3a22d" strokeWidth="1"><path d="M94 37l2.5 5.5 6 2-6 2.5-2.5 5.5-2.5-5.5-6-2.5 6-2Z"/><path d="M25 30l2 4 4 1.5-4 2-2 4-2-4-4-2 4-1.5Z"/></g>}
    {accessory==='party'&&<g><path d="M42 27 59 3 77 28Z" fill="#f18ab0" stroke="#9d456b" strokeWidth="2" strokeLinejoin="round"/><circle cx="59" cy="4" r="3" fill="#f7d15d"/></g>}
   </g>
  </svg>
 </div>
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
