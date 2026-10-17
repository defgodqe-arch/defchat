import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Sparkles,X,Heart,Gift,ChevronRight,Star,MessageCircle,Palette,Settings} from 'lucide-react';

const variants=[
 {id:'sunny',name:'Sunflare',unlock:1,desc:'A golden baby fire dragon',body:'#facc15',shadow:'#f59e0b',accent:'#fff1a8',eye:'#29251b',kind:'star'},
 {id:'berry',name:'Violet Fang',unlock:2,desc:'A violet dragon with a spicy streak',body:'#b18cff',shadow:'#805ad5',accent:'#f0e5ff',eye:'#211a35',kind:'round'},
 {id:'aqua',name:'Tideflame',unlock:4,desc:'An aqua dragon with blue-hot flames',body:'#59e2e8',shadow:'#129eae',accent:'#d6ffff',eye:'#12363b',kind:'round'},
 {id:'ember',name:'Emberclaw',unlock:6,desc:'A fiery little dragon',body:'#ff8b55',shadow:'#dc4c35',accent:'#ffe0b9',eye:'#3d2019',kind:'star'},
 {id:'moon',name:'Moonscale',unlock:9,desc:'A moonlit dragon with silver scales',body:'#d5d9ee',shadow:'#8995bd',accent:'#fff',eye:'#292e4b',kind:'moon'},
 {id:'glitch',name:'Glitchfire',unlock:12,desc:'A rare neon fire-breathing dragon',body:'#80ffb5',shadow:'#18a86a',accent:'#f2ff7c',eye:'#122b25',kind:'glitch'}
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
 const bodyFill='url(#dragon-coat-'+v.id+')';
 return <div className={'mascot-buddy mascot-mood-'+mood+(compact?' mascot-compact':'')} style={{'--buddy-body':v.body,'--buddy-shadow':v.shadow,'--buddy-light':v.accent,'--buddy-eye':v.eye,width:size,height:size}} onClick={onClick} role={onClick?'button':'img'} tabIndex={onClick?0:undefined} onKeyDown={onClick?e=>{if(e.key==='Enter'||e.key===' ')onClick()}:undefined} aria-label={'Play with your fire dragon: '+v.name}>
  <svg viewBox="0 0 150 120" width="100%" height="100%" role="img" aria-label={v.name+' fire dragon'}>
   <defs>
    <linearGradient id={'dragon-coat-'+v.id} x1="0" y1="0" x2=".9" y2="1"><stop stopColor={v.accent}/><stop offset=".45" stopColor={v.body}/><stop offset="1" stopColor={v.shadow}/></linearGradient>
    <linearGradient id={'dragon-belly-'+v.id} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff9e8"/><stop offset="1" stopColor="#f0dfbd"/></linearGradient>
    <linearGradient id={'dragon-fire-'+v.id} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#fff4a3"/><stop offset=".4" stopColor="#ffb52e"/><stop offset="1" stopColor="#ff4d1f" stopOpacity=".15"/></linearGradient>
   </defs>
   <ellipse cx="76" cy="108" rx="34" ry="5" fill="#171717" opacity=".13"/>
   <g className="mascot-float">
    {/* Tail and feet */}
    <path d="M91 81Q112 90 121 78L132 72 128 86 139 91 122 96Q104 102 91 91Z" fill={bodyFill} stroke={v.shadow} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M48 87 44 100Q42 104 49 104H63L68 98 68 88M81 89 83 100Q82 104 90 104H101L104 98 98 87" fill={bodyFill} stroke={v.shadow} strokeWidth="2.5" strokeLinejoin="round"/>
    {/* Little dragon wings */}
    <path d="M57 58Q37 28 17 36L27 50 12 49 27 66 24 77 51 77Z" fill={v.shadow} stroke={v.shadow} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M52 63 28 43 35 60 26 59 42 74Z" fill={v.accent} opacity=".72"/>
    <path d="M88 57Q107 27 128 35L119 49 134 48 119 65 122 76 95 77Z" fill={v.shadow} stroke={v.shadow} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M94 62 117 42 111 59 121 58 104 73Z" fill={v.accent} opacity=".72"/>
    {/* Body and belly */}
    <path d="M43 63Q45 43 66 41L91 49Q105 59 99 82Q93 98 71 98Q48 98 40 82Z" fill={bodyFill} stroke={v.shadow} strokeWidth="2.8" strokeLinejoin="round"/>
    <path d="M56 75Q70 68 89 76L88 88Q72 96 57 87Z" fill={'url(#dragon-belly-'+v.id+')'} opacity=".9"/>
    {/* Head, horns and snout */}
    <path d="M45 48 35 30Q34 26 39 29L54 40Q67 34 80 41L92 29Q97 27 96 33L91 48Q103 54 101 67L91 77 57 75 44 65Z" fill={bodyFill} stroke={v.shadow} strokeWidth="2.8" strokeLinejoin="round"/>
    <path d="M48 43 46 34 55 41Z M82 41 91 34 88 45Z" fill={v.accent} stroke={v.shadow} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M83 57Q96 54 105 62L101 72 83 71 77 65Z" fill={bodyFill} stroke={v.shadow} strokeWidth="2.3" strokeLinejoin="round"/>
    <ellipse cx="96" cy="62" rx="2" ry="1.5" fill={v.eye}/><ellipse cx="101" cy="63" rx="1.6" ry="1.3" fill={v.eye}/>
    <path d="M56 53Q62 48 68 53M74 53Q80 48 85 53" fill="none" stroke={v.shadow} strokeWidth="2.2" strokeLinecap="round"/>
    <ellipse cx="62" cy="59" rx="4.2" ry={mood==='sleepy'?1.5:5.5} fill={v.eye}/>
    <ellipse cx="79" cy="59" rx="4.2" ry={mood==='sleepy'?1.5:5.5} fill={v.eye}/>
    {mood!=='sleepy'&&<g fill="#fff"><circle cx="63" cy="57" r="1.5"/><circle cx="80" cy="57" r="1.5"/></g>}
    <path d={mood==='fire'?'M78 68Q85 66 91 70':'M65 69Q71 75 78 69'} fill="none" stroke={v.eye} strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M48 66q4-3 7 0M81 67q4-3 7 0" fill="none" stroke="#d96d68" strokeWidth="3" strokeLinecap="round" opacity=".6"/>
    {/* Breath of fire! */}
    {mood==='fire'&&<g className="mascot-fire-breath">
      <path d="M103 62Q117 48 128 55Q124 61 139 62Q127 68 138 76Q120 79 108 69Z" fill={'url(#dragon-fire-'+v.id+')'} stroke="#ff8a22" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M104 64Q117 58 128 63L119 67 109 68Z" fill="#fff6a3"/>
      <path d="M112 52l3-5M123 53l5-5M126 78l5 4" stroke="#ffb52e" strokeWidth="2" strokeLinecap="round"/>
    </g>}
    {/* Collectible cosmetics */}
    {accessory==='halo'&&<ellipse cx="69" cy="22" rx="15" ry="4.5" fill="none" stroke="#fff4c5" strokeWidth="3.5"/>}
    {accessory==='crown'&&<path d="M49 37 45 22 58 30 69 16 81 30 94 22 90 39Z" fill="#f5c94e" stroke="#9e711b" strokeWidth="2" strokeLinejoin="round"/>}
    {accessory==='flower'&&<g transform="translate(95 38)" stroke="#a56b38" strokeWidth="1"><circle cy="-5" r="4.5" fill="#ff91ad"/><circle cx="5" cy="-1" r="4.5" fill="#ff91ad"/><circle cx="3" cy="5" r="4.5" fill="#ff91ad"/><circle cx="-3" cy="5" r="4.5" fill="#ff91ad"/><circle cx="-5" cy="-1" r="4.5" fill="#ff91ad"/><circle r="3.5" fill="#f7d35a"/></g>}
    {accessory==='star'&&<g fill="#fff0a1" stroke="#d3a22d" strokeWidth="1"><path d="M112 36l2.5 5.5 6 2-6 2.5-2.5 5.5-2.5-5.5-6-2.5 6-2Z"/><path d="M30 29l2 4 4 1.5-4 2-2 4-2-4-4-2 4-1.5Z"/></g>}
    {accessory==='party'&&<g><path d="M52 38 69 12 87 39Z" fill="#f18ab0" stroke="#9d456b" strokeWidth="2" strokeLinejoin="round"/><circle cx="69" cy="13" r="3" fill="#f7d15d"/></g>}
   </g>
  </svg>
 </div>
}
export function MascotMark({size=36}){return <span className="mascot-mark">{markSvg(size)}</span>}
export default function MascotCompanion({userId,username='friend',onOpenCollection}) {
 const [data,setData]=useState(()=>load(userId||'guest'));
 const [open,setOpen]=useState(false),[mood,setMood]=useState('happy'),[toast,setToast]=useState('Your buddy is happy to see you!'),[lastTap,setLastTap]=useState(0);
 const [position,setPosition]=useState(null);
 const [behaviorOpen,setBehaviorOpen]=useState(false);
 const [behavior,setBehavior]=useState(()=>{try{return {...{flight:true,messageReactions:true,sound:true,flightSpeed:'normal',idle:'playful'},...JSON.parse(localStorage.getItem('defchat:mascot-behavior:'+(userId||'guest'))||'{}')}}catch{return {flight:true,messageReactions:true,sound:true,flightSpeed:'normal',idle:'playful'}}});
 const [visible,setVisible]=useState(()=>{try{return JSON.parse(localStorage.getItem('defchat:preferences:'+(userId||'guest'))||'{}').showBuddy!==false}catch{return true}});
 const dockRef=useRef(null),dragRef=useRef(null),draggedRef=useRef(false),positionRef=useRef(null);
 positionRef.current=position;
 const current=getLevel(data.xp||0),v=variants.find(x=>x.id===data.variant)||variants[0],acc=accessories.find(x=>x.id===data.accessory)||accessories[0];
 const unlocked=useMemo(()=>variants.filter(x=>current.level>=x.unlock),[current.level]);
 function persist(next){setData(next);try{localStorage.setItem('defchat:mascot:'+(userId||'guest'),JSON.stringify(next))}catch{}}
 function award(amount,reason){setData(prev=>{const before=getLevel(prev.xp||0);const next={...prev,xp:(prev.xp||0)+amount};try{localStorage.setItem('defchat:mascot:'+(userId||'guest'),JSON.stringify(next))}catch{}const after=getLevel(next.xp);if(after.level>before.level){setToast('Level up! Your buddy reached level '+after.level+'!');setMood('excited')}else setToast(reason||'+'+amount+' buddy XP');return next})}
 useEffect(()=>{setData(load(userId||'guest'));try{const saved=JSON.parse(localStorage.getItem('defchat:mascot-position:'+(userId||'guest'))||'null');setPosition(saved&&Number.isFinite(saved.left)&&Number.isFinite(saved.top)?saved:null)}catch{setPosition(null)}try{setBehavior({...{flight:true,messageReactions:true,sound:true,flightSpeed:'normal',idle:'playful'},...JSON.parse(localStorage.getItem('defchat:mascot-behavior:'+(userId||'guest'))||'{}')})}catch{setBehavior({flight:true,messageReactions:true,sound:true,flightSpeed:'normal',idle:'playful'})}},[userId]);
 function updateBehavior(key,value){setBehavior(prev=>{const next={...prev,[key]:value};try{localStorage.setItem('defchat:mascot-behavior:'+(userId||'guest'),JSON.stringify(next))}catch{}return next})}
 useEffect(()=>{const sync=()=>{try{setVisible(JSON.parse(localStorage.getItem('defchat:preferences:'+(userId||'guest'))||'{}').showBuddy!==false)}catch{setVisible(true)}};const onVisibility=e=>setVisible(e.detail?.visible!==false);sync();window.addEventListener('defchat:buddy-visibility',onVisibility);window.addEventListener('storage',sync);return()=>{window.removeEventListener('defchat:buddy-visibility',onVisibility);window.removeEventListener('storage',sync)}},[userId]);
 useEffect(()=>{
  const move=e=>{
   const drag=dragRef.current,dock=dockRef.current;if(!drag||!dock)return;
   if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6)return;
   drag.moved=true;draggedRef.current=true;
   const rect=dock.getBoundingClientRect(),left=Math.max(4,Math.min(window.innerWidth-rect.width-4,e.clientX-drag.offsetX)),top=Math.max(4,Math.min(window.innerHeight-rect.height-4,e.clientY-drag.offsetY));
   setPosition({left,top});
  };
  const end=()=>{const drag=dragRef.current;if(drag?.moved){try{localStorage.setItem('defchat:mascot-position:'+(userId||'guest'),JSON.stringify(positionRef.current||{}))}catch{}}dragRef.current=null};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end)};
 },[userId]);
 useEffect(()=>{const onXp=e=>award(Math.max(1,Number(e.detail?.amount)||5),e.detail?.reason||'Your buddy earned XP!');window.addEventListener('defchat:mascot-xp',onXp);return()=>window.removeEventListener('defchat:mascot-xp',onXp)},[userId]);
 useEffect(()=>{const onSent=()=>{if(!behavior.messageReactions)return;setMood('excited');setToast('Yay! You sent a message! ✨');if(!open)setToast('Nice message! Your buddy is cheering you on.');if(behavior.sound){try{const Ctx=window.AudioContext||window.webkitAudioContext;if(Ctx){const ctx=new Ctx(),o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(660,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(990,ctx.currentTime+.11);g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.035,ctx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.18);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.19);o.onended=()=>ctx.close()}}catch{}}const timer=setTimeout(()=>setMood('happy'),1800);return()=>clearTimeout(timer)};window.addEventListener('defchat:message-sent',onSent);return()=>window.removeEventListener('defchat:message-sent',onSent)},[userId,open,behavior.messageReactions,behavior.sound]);
 function pet(){const now=Date.now();setOpen(true);if(now-lastTap>15000){setLastTap(now);award(1,'Your dragon loved that! +1 XP')}setMood('excited');setTimeout(()=>setMood('happy'),1200)}
 function breatheFire(){setOpen(true);setMood('fire');setToast('FWOOSH! Dragon fire! 🔥');award(2,'Fire breath! +2 XP');if(behavior.sound)try{const Ctx=window.AudioContext||window.webkitAudioContext;if(Ctx){const a=new Ctx(),o=a.createOscillator(),g=a.createGain();o.type='sawtooth';o.frequency.setValueAtTime(170,a.currentTime);o.frequency.exponentialRampToValueAtTime(65,a.currentTime+.32);g.gain.setValueAtTime(.0001,a.currentTime);g.gain.exponentialRampToValueAtTime(.055,a.currentTime+.035);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.34);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.36);o.onended=()=>a.close()}}catch{}setTimeout(()=>setMood('happy'),950)}
 function equipVariant(id){if(current.level<(variants.find(x=>x.id===id)?.unlock||99))return;persist({...data,variant:id});setToast('Your buddy changed form!')}
 function equipAccessory(id){if(current.level<(accessories.find(x=>x.id===id)?.unlock||99))return;persist({...data,accessory:id});setToast('Accessory equipped!')}
 if(!userId||!visible)return null;
 const dockStyle=position?{left:position.left,top:position.top,right:"auto",bottom:"auto"}:undefined;
 function startDrag(e){if(e.button!==undefined&&e.button!==0)return;const rect=dockRef.current?.getBoundingClientRect();if(!rect)return;e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}draggedRef.current=false;dragRef.current={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top,moved:false}}
 function toggleMascot(){if(draggedRef.current){draggedRef.current=false;return}setOpen(x=>!x)}
 return <div ref={dockRef} className="mascot-dock" style={dockStyle}>
  {open&&<section className="mascot-panel" role="dialog" aria-label="Your defchat mascot">
   <div className="mascot-panel-head"><div><span className="mascot-eyebrow"><Sparkles size={12}/> YOUR FIRE DRAGON</span><h3>{v.name} <span>Lv. {current.level}</span></h3></div><button type="button" className="mascot-close" onClick={()=>setOpen(false)} aria-label="Close mascot panel"><X size={17}/></button></div>
   <div className="mascot-stage"><div className="mascot-stage-glow"/><Buddy variant={v.id} accessory={acc.id} size={136} mood={mood} onClick={pet}/><span className="mascot-level-pill"><Star size={12} fill="currentColor"/> LEVEL {current.level}</span></div>
   <div className="mascot-progress"><div className="mascot-progress-meta"><span>{data.xp||0} total XP</span><b>{current.into}/{current.needed} XP</b></div><div className="mascot-progress-track"><i style={{width:(current.into/current.needed*100)+'%'}}/></div><small>{current.needed-current.into} XP to level {current.level+1}</small></div>
   <div className="mascot-toast" role="status">{toast}</div>
   <div className="mascot-action-row"><button type="button" onClick={breatheFire} className="mascot-fire-button"><span>🔥</span> Breathe fire <small>+2 XP</small></button><button type="button" onClick={pet}><Heart size={15} fill="currentColor"/> Pet dragon <small>+1 XP / 15s</small></button><button type="button" onClick={()=>{setMood('sleepy');setToast('Shhh… '+v.name+' is taking a tiny nap.')}}>Nap <span>☾</span></button></div>
    <button type="button" className={'mascot-behavior-toggle '+(behaviorOpen?'is-open':'')} onClick={()=>setBehaviorOpen(x=>!x)}><Settings size={14}/> Behavior settings <span>{behaviorOpen?'−':'+'}</span></button>
    {behaviorOpen&&<section className="mascot-behavior-settings" aria-label="Buddy behavior settings">
      <label className="mascot-setting-row"><span><b>Fly around the screen</b><small>Let Buddy explore the page</small></span><input type="checkbox" checked={behavior.flight} onChange={e=>updateBehavior('flight',e.target.checked)}/></label>
      <label className="mascot-setting-row"><span><b>React to sent messages</b><small>Cheer when you send a message</small></span><input type="checkbox" checked={behavior.messageReactions} onChange={e=>updateBehavior('messageReactions',e.target.checked)}/></label>
      <label className="mascot-setting-row"><span><b>Sound effects</b><small>Play a chirp and fire-breath sound</small></span><input type="checkbox" checked={behavior.sound} onChange={e=>updateBehavior('sound',e.target.checked)}/></label>
      <label className="mascot-setting-row"><span><b>Flight speed</b><small>How quickly Buddy crosses the screen</small></span><select value={behavior.flightSpeed} onChange={e=>updateBehavior('flightSpeed',e.target.value)}><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Zoomies</option></select></label>
      <label className="mascot-setting-row"><span><b>Idle animation</b><small>How Buddy acts between interactions</small></span><select value={behavior.idle} onChange={e=>updateBehavior('idle',e.target.value)}><option value="playful">Playful</option><option value="calm">Calm</option><option value="sleepy">Sleepy</option></select></label>
    </section>}
   <div className="mascot-collection-title"><span><Palette size={14}/> Forms & cosmetics</span><small>{unlocked.length}/{variants.length} forms</small></div>
   <div className="mascot-variants">{variants.map(item=><button type="button" key={item.id} disabled={current.level<item.unlock} className={'mascot-variant '+(data.variant===item.id?'is-equipped':'')+(current.level<item.unlock?' is-locked':'')} onClick={()=>equipVariant(item.id)} title={current.level<item.unlock?'Unlock at level '+item.unlock:item.name}><span className="mascot-variant-art" style={{'--buddy-body':item.body,'--buddy-shadow':item.shadow}}><Buddy variant={item.id} size={48}/>{current.level<item.unlock&&<i>🔒</i>}</span><b>{item.name}</b><small>{current.level<item.unlock?'Lv. '+item.unlock:'Tap to equip'}</small></button>)}</div>
   <div className="mascot-collection-title"><span><Gift size={14}/> Accessories</span><small>{accessories.filter(x=>current.level>=x.unlock).length}/{accessories.length} unlocked</small></div>
   <div className="mascot-accessories">{accessories.map(item=><button type="button" key={item.id} disabled={current.level<item.unlock} className={(data.accessory===item.id?'is-equipped ':'')+(current.level<item.unlock?'is-locked':'')} onClick={()=>equipAccessory(item.id)} title={current.level<item.unlock?'Unlock at level '+item.unlock:item.name}><span>{item.icon}</span><small>{item.name}</small></button>)}</div>
   <div className="mascot-panel-foot"><MessageCircle size={13}/> Chat to earn XP · help your dragon grow stronger.</div>
  </section>}
  <button type="button" className={'buddy-flight'+(!behavior.flight?' buddy-flight-paused':'')} data-idle={behavior.idle} style={{'--buddy-flight-duration':behavior.flightSpeed==='slow'?'42s':behavior.flightSpeed==='fast'?'14s':'28s'}} onClick={toggleMascot} aria-label={open?'Close Buddy panel':'Open Buddy panel'} title="Click Buddy to play"><img src="https://i.pinimg.com/736x/ef/5b/57/ef5b5718336f6f720bf9f6ba61f50165.jpg" alt="Buddy flying around the screen"/><span className="mascot-launcher-level">{current.level}</span></button>
 </div>
}
