import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Heart,Play,RotateCcw,Volume2,VolumeX,Sparkles,Shield} from 'lucide-react';

const WIDTH=960,HEIGHT=520,SEGMENT=1000;
const palettes=[
 {sky1:'#f7c77e',sky2:'#ffe79a',sun:'#fff2c2',ground:'#102d3c',top:'#df713d',accent:'#ffdf66'},
 {sky1:'#f5b7a2',sky2:'#ffd7a5',sun:'#fff0bf',ground:'#422b4c',top:'#d96c70',accent:'#fff08a'},
 {sky1:'#8ed4d1',sky2:'#d8f0b0',sun:'#fff6c4',ground:'#174b54',top:'#e6a85d',accent:'#fff1a1'},
 {sky1:'#b7b5f2',sky2:'#ffe1bd',sun:'#fff6cf',ground:'#28395d',top:'#e17a54',accent:'#ffe078'},
 {sky1:'#f1a85e',sky2:'#f8df9d',sun:'#fff1b5',ground:'#263e43',top:'#bf6542',accent:'#ffe56b'}
];
function rngFor(seed){let s=(seed*9301+49297)%233280;return ()=>{s=(s*9301+49297)%233280;return s/233280;};}
function makeSegment(level){
 const rand=rngFor(level*7919+17),start=(level-1)*SEGMENT,end=start+SEGMENT;
 const palette=palettes[Math.floor(rand()*palettes.length)];
 const platforms=[],spikes=[],coins=[],enemies=[];
 let x=start;
 while(x<end+100){
  const w=155+rand()*170;
  const y=(level===1&&x===start)?445:365+rand()*75;
  platforms.push({x,y,w,h:76});
  if(x>start+80&&rand()<.78){
   const count=rand()<.35?2:1;
   for(let j=0;j<count;j++){
    const sx=x+45+j*32;
    spikes.push({x:sx,baseY:y-24,y:y-24,w:24,h:24});
   }
  }
  if(rand()<.88){
   const cx=x+45+rand()*Math.max(25,w-70);
   coins.push({x:cx,y:y-65-rand()*35,taken:false});
  }
  if(level>2&&rand()<.32)enemies.push({x:x+w*.65,y:y-29,dir:rand()<.5?-1:1,alive:true,homeX:x+w*.65,range:25+rand()*35,speed:35+rand()*45});
  x+=w+25+rand()*60;
 }
 return {level,start,end,palette,platforms,spikes,coins,enemies};
}
function makeWorld(){return {player:{x:60,y:390,vy:0,grounded:false,invulnerable:0},segments:[makeSegment(1)],cameraX:0};}
export default function AstralProjection({user,onClose}){
 const canvas=useRef(null),world=useRef(makeWorld()),keys=useRef({}),[level,setLevel]=useState(1),[coins,setCoins]=useState(0),[lives,setLives]=useState(3),[best,setBest]=useState(()=>{try{return Number(localStorage.getItem('defchat:solarbound:'+((user&&user.id)||'guest'))||1)}catch{return 1}}),[paused,setPaused]=useState(true),[over,setOver]=useState(false),[muted,setMuted]=useState(true);
 const storeKey='defchat:solarbound:'+((user&&user.id)||'guest');
 useEffect(()=>{
  const down=e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup',' '].includes(k))e.preventDefault();keys.current[k]=true;if(k==='escape')setPaused(v=>!v);};
  const up=e=>{keys.current[e.key.toLowerCase()]=false;};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)};
 },[]);
 useEffect(()=>{
  let raf,previous=0;
  const draw=now=>{
   const c=canvas.current;if(!c){raf=requestAnimationFrame(draw);return;}
   const ctx=c.getContext('2d'),scale=Math.min(c.width/WIDTH,c.height/HEIGHT),offsetX=(c.width-WIDTH*scale)/2,offsetY=(c.height-HEIGHT*scale)/2;
   ctx.clearRect(0,0,c.width,c.height);ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
   const g=world.current,p=g.player,dt=Math.min((now-previous)/1000||0.016,0.033);previous=now;
   const currentLevel=Math.max(1,Math.floor(p.x/SEGMENT)+1);
   while(g.segments[g.segments.length-1].level<currentLevel+2)g.segments.push(makeSegment(g.segments[g.segments.length-1].level+1));
   g.segments=g.segments.filter(s=>s.end>p.x-SEGMENT*2);
   const active=g.segments.find(s=>s.level===currentLevel)||g.segments[g.segments.length-1];
   const palette=active.palette;
   const sky=ctx.createLinearGradient(0,0,0,HEIGHT);sky.addColorStop(0,palette.sky1);sky.addColorStop(1,palette.sky2);ctx.fillStyle=sky;ctx.fillRect(0,0,WIDTH,HEIGHT);
   const cameraPreview=Math.max(0,p.x-230);
   const glow=ctx.createRadialGradient(530,240,10,530,240,320);glow.addColorStop(0,'rgba(255,255,225,.85)');glow.addColorStop(.5,'rgba(255,241,170,.32)');glow.addColorStop(1,'rgba(255,222,145,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,WIDTH,HEIGHT);
   ctx.fillStyle=palette.sun;ctx.beginPath();ctx.arc(530,240,58,0,Math.PI*2);ctx.fill();
   for(let i=0;i<15;i++){const x=((i*107-cameraPreview*.16)%1200+1200)%1200-100,y=25+(i*47)%190,w=55+(i*23)%100;ctx.fillStyle=i%2?'rgba(230,172,111,.22)':'rgba(255,247,196,.4)';ctx.beginPath();ctx.ellipse(x,y,w,13+(i%4)*5,0,0,Math.PI*2);ctx.fill();}
   ctx.save();ctx.translate(-cameraPreview,0);
   if(!paused&&!over){
    // Geometry Dash-inspired auto-run: the world scrolls continuously; sections never teleport.
    p.x+=310*dt;
    if((keys.current[' ']||keys.current.w||keys.current.arrowup)&&p.grounded){p.vy=-610;p.grounded=false;}
    p.vy+=1580*dt;const oldY=p.y;p.y+=p.vy*dt;p.grounded=false;
    for(const s of g.segments){
     for(const pl of s.platforms)if(p.vy>=0&&p.x+27>pl.x&&p.x+5<pl.x+pl.w&&oldY+34<=pl.y+8&&p.y+34>=pl.y){p.y=pl.y-34;p.vy=0;p.grounded=true;}
     s.coins.forEach(co=>{if(!co.taken&&Math.hypot(p.x+16-co.x,p.y+16-co.y)<27){co.taken=true;setCoins(v=>v+1);}});
     s.enemies.forEach(en=>{if(!en.alive)return;en.x+=en.dir*en.speed*dt;if(Math.abs(en.x-en.homeX)>en.range)en.dir*=-1;if(Math.abs(p.x-en.x)<27&&Math.abs(p.y-en.y)<31){if(p.vy>100&&p.y<en.y){en.alive=false;p.vy=-310;setCoins(v=>v+2);}else if(p.invulnerable<=0){p.invulnerable=1.1;setLives(v=>{if(v<=1)setOver(true);return Math.max(0,v-1);});}}});
    }
    if(g.segments.some(s=>s.spikes.some(sp=>p.invulnerable<=0&&p.x+27>sp.x+3&&p.x+5<sp.x+sp.w-3&&p.y+31>sp.y+5&&p.y+5<sp.y+sp.h))){p.invulnerable=1.1;setLives(v=>{if(v<=1)setOver(true);return Math.max(0,v-1);});}
    p.invulnerable=Math.max(0,p.invulnerable-dt);
    if(p.y>HEIGHT+100){setLives(v=>{if(v<=1)setOver(true);return Math.max(0,v-1);});const respawn=Math.max(1,Math.floor(p.x/SEGMENT)+1);p.x=(respawn-1)*SEGMENT+35;p.y=320;p.vy=0;p.invulnerable=1.5;}
    if(currentLevel!==level){setLevel(currentLevel);setBest(v=>{const n=Math.max(v,currentLevel);try{localStorage.setItem(storeKey,String(n));}catch{}return n;});}
   }
   // Draw all nearby generated terrain and obstacles in world coordinates.
   for(const s of g.segments){
    s.platforms.forEach(pl=>{
     ctx.fillStyle=s.palette.ground;ctx.beginPath();ctx.moveTo(pl.x,pl.y+8);ctx.lineTo(pl.x+pl.w,pl.y+8);ctx.lineTo(pl.x+pl.w-10,pl.y+pl.h*.62);ctx.lineTo(pl.x+pl.w*.72,pl.y+pl.h);ctx.lineTo(pl.x+pl.w*.25,pl.y+pl.h*.84);ctx.lineTo(pl.x+5,pl.y+pl.h*.5);ctx.closePath();ctx.fill();
     ctx.fillStyle=s.palette.top;ctx.fillRect(pl.x,pl.y,pl.w,9);
     for(let q=0;q<Math.floor(pl.w/15);q++){ctx.fillStyle=q%2?'#a94732':'#e38a45';ctx.fillRect(pl.x+q*15,pl.y-2+(q%3)*2,8,5);}
    });
    s.spikes.forEach(sp=>{ctx.fillStyle='#7f2532';ctx.beginPath();ctx.moveTo(sp.x,sp.y+sp.h);ctx.lineTo(sp.x+sp.w/2,sp.y);ctx.lineTo(sp.x+sp.w,sp.y+sp.h);ctx.closePath();ctx.fill();ctx.fillStyle='#ff9b68';ctx.fillRect(sp.x+sp.w/2-2,sp.y+8,4,9);});
    s.coins.forEach(co=>{if(co.taken)return;ctx.fillStyle=s.palette.accent;ctx.shadowColor='#ffc83d';ctx.shadowBlur=13;ctx.beginPath();ctx.ellipse(co.x,co.y,8,12,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff3b4';ctx.fillRect(co.x-1,co.y-6,2,12);});
    s.enemies.forEach(en=>{if(!en.alive)return;ctx.fillStyle='#9b3f2d';ctx.fillRect(en.x+3,en.y+7,22,20);ctx.fillRect(en.x,en.y+12,28,12);ctx.fillStyle='#f8d36b';ctx.fillRect(en.x+7,en.y+11,4,4);ctx.fillRect(en.x+18,en.y+11,4,4);});
   }
   if(p.invulnerable<=0||Math.floor(now/100)%2===0){
    const hx=Math.round(p.x),hy=Math.round(p.y);
    ctx.fillStyle='#143d4a';ctx.fillRect(hx+7,hy+2,19,13);ctx.fillStyle='#276b72';ctx.fillRect(hx+4,hy+7,24,12);
    ctx.fillStyle='#e5c17a';ctx.fillRect(hx+12,hy+5,10,9);ctx.fillStyle='#182a35';ctx.fillRect(hx+13,hy+8,3,3);ctx.fillRect(hx+20,hy+8,3,3);
    ctx.fillStyle='#b63e38';ctx.fillRect(hx+3,hy+15,26,7);ctx.fillStyle='#e05b42';ctx.fillRect(hx+8,hy+21,17,7);
    ctx.fillStyle='#233b47';ctx.fillRect(hx+8,hy+26,6,5);ctx.fillRect(hx+20,hy+26,6,5);
    ctx.fillStyle='#3bc1c0';ctx.fillRect(hx+5,hy+30,10,4);ctx.fillRect(hx+19,hy+30,10,4);
    ctx.fillStyle='#d9a75e';ctx.fillRect(hx+8,hy,15,3);ctx.fillStyle='#2a6871';ctx.fillRect(hx+5,hy-3,18,5);
    ctx.fillStyle='#bd3e35';ctx.fillRect(hx-9,hy+14,14,4);ctx.fillRect(hx-16,hy+11,9,4);
   }
   ctx.restore();
   ctx.restore();
   ctx.fillStyle='rgba(25,48,55,.84)';ctx.fillRect(14,14,250,78);ctx.fillStyle='#f6d779';ctx.fillRect(14,14,250,4);ctx.fillStyle='#ffe5a0';ctx.font='bold 21px monospace';ctx.fillText('LEVEL '+level+' · INFINITE',28,42);ctx.fillStyle='#fff5d4';ctx.font='14px monospace';ctx.fillText('SUN COINS  '+coins,28,66);ctx.fillText('LIVES  '+lives,150,66);
   ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(0,HEIGHT-5,WIDTH,5);ctx.fillStyle='#df713d';ctx.fillRect(0,HEIGHT-5,WIDTH*Math.min(1,(p.x%SEGMENT)/SEGMENT),5);
   if(paused||over){ctx.fillStyle='rgba(5,7,19,.76)';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.textAlign='center';ctx.fillStyle='#ffe28a';ctx.font='bold 32px system-ui';ctx.fillText(over?'RUN ENDED':'SOLARBOUND',WIDTH/2,HEIGHT/2-34);ctx.fillStyle='#f3e9dc';ctx.font='16px system-ui';ctx.fillText(over?'You were caught by the sun’s trials. Restart and try again.':'Auto-run through endless, randomly generated sun worlds.',WIDTH/2,HEIGHT/2+2);ctx.fillStyle='#ffcf57';ctx.font='bold 15px system-ui';ctx.fillText(over?'Press Restart to run again.':'Press Play · Space/W/↑ to jump',WIDTH/2,HEIGHT/2+34);ctx.textAlign='left';}
   raf=requestAnimationFrame(draw);
  };
  raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
 },[paused,level,over,coins,lives,storeKey]);
 function start(){setPaused(false);setOver(false);}
 function restart(){world.current=makeWorld();setLevel(1);setCoins(0);setLives(3);setOver(false);setPaused(true);keys.current={};}
 const press=key=>{keys.current[key]=true;setTimeout(()=>{keys.current[key]=false;},160);};
 return <div className="astral-overlay"><section className="astral-shell solarbound-shell" role="dialog" aria-modal="true" aria-label="Solarbound side-scrolling game"><header className="astral-header"><button className="astral-back" onClick={onClose}><ArrowLeft size={17}/> Back to Cinder</button><div className="astral-title-mark"><span className="astral-mark"><Sparkles size={20}/></span><div><b>SOLARBOUND</b><small>AN INFINITE SUN-RUNNER</small></div></div><div className="astral-header-actions"><button onClick={()=>setMuted(v=>!v)} aria-label={muted?'Enable sound':'Mute sound'} title={muted?'Enable sound':'Mute sound'}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><button onClick={()=>setPaused(v=>!v)} title={paused?'Play':'Pause'}>{paused?<Play size={18}/>:<span>Ⅱ</span>}</button><button onClick={onClose} aria-label="Close game">×</button></div></header><div className="astral-content"><div className="astral-intro"><div><span className="astral-eyebrow"><Sparkles size={13}/> RUN · JUMP · SURVIVE</span><h1>Chase the sunrise. <em>Never stop running.</em></h1><p>The camera follows your character through a seamless, endless course. Every section gets its own randomized platforms, grounded spikes, coins, enemies, and color palette.</p></div><div className="astral-record"><small>BEST LEVEL</small><b>{best.toLocaleString()} <span>/ ∞</span></b></div></div><div className="astral-hud"><div><Sparkles size={16}/><span>LEVEL</span><b>{level} / ∞</b></div><div><Shield size={16}/><span>SUN COINS</span><b>{coins}</b></div><div><Heart size={16}/><span>LIVES</span><b>{'♥ '.repeat(lives)}{'♡ '.repeat(Math.max(0,3-lives))}</b></div><div className="astral-objective">AUTO-RUN · JUMP OVER SPIKES · ENDLESS UNIQUE SECTIONS</div></div><div className="astral-game-frame solarbound-frame"><canvas ref={canvas} width={WIDTH} height={HEIGHT} aria-label="Solarbound endless side-scrolling game. Character runs automatically; press Space, W, Up arrow, or the on-screen up button to jump over spikes."/><div className="astral-mobile-controls"><div><button onTouchStart={()=>press(' ')} onClick={()=>press(' ')}>↑ JUMP</button></div></div></div><div className="astral-bottom"><div><Sparkles size={16}/><span><b>Controls</b> Auto-run · Space/W/↑ or tap JUMP</span></div><div className="astral-action-row">{paused&&!over&&<button onClick={start}><Play size={15}/> Play</button>}<button onClick={()=>setPaused(v=>!v)}><Play size={15}/> {paused?'Resume':'Pause'}</button><button onClick={restart}><RotateCcw size={15}/> Restart</button></div></div><p className="astral-disclaimer">Solarbound is an original endless side-scrolling platform adventure with procedurally generated stages.</p></div></section></div>;
}