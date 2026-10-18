import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Heart,Play,RotateCcw,Volume2,VolumeX,Sparkles,Shield} from 'lucide-react';

const WIDTH=960,HEIGHT=520;
const makeLevel=(level)=> {
  const platforms=[{x:0,y:445,w:230,h:90}];
  let x=250;
  while(x<790){
    const w=82+Math.random()*65;
    const y=285+Math.random()*145;
    platforms.push({x,y,w,h:18});
    x+=w+45+Math.random()*55;
  }
  platforms.push({x:Math.max(790,x-10),y:330+Math.random()*65,w:190,h:180});
  const coins=Array.from({length:6},(_,i)=>({x:275+i*105+Math.random()*35,y:245+Math.random()*125,taken:false}));
  const enemies=Array.from({length:Math.min(5,1+Math.floor(level/4))},(_,i)=>({x:320+i*125,y:315+Math.random()*65,dir:Math.random()<.5?-1:1,alive:true}));
  const spikes=Array.from({length:Math.min(5,1+Math.floor(level/2))},(_,i)=>({x:285+i*105+Math.random()*30,baseY:270+Math.random()*110,y:270,phase:Math.random()*Math.PI*2,amplitude:24+Math.random()*38,speed:1.5+Math.random()*1.8,w:24,h:24}));
  return {player:{x:58,y:340,vx:0,vy:0,grounded:false,invulnerable:0},platforms,coins,enemies,spikes,bossHp:100,bossX:700,bossTime:0};
};
export default function AstralProjection({user,onClose}){
 const canvas=useRef(null),world=useRef(makeLevel(1)),keys=useRef({}),last=useRef(0),[level,setLevel]=useState(1),[coins,setCoins]=useState(0),[lives,setLives]=useState(3),[best,setBest]=useState(()=>{try{return Number(localStorage.getItem('defchat:solarbound:'+((user&&user.id)||'guest'))||1)}catch{return 1}}),[paused,setPaused]=useState(true),[over,setOver]=useState(false),[won,setWon]=useState(false),[muted,setMuted]=useState(true);
 const storeKey='defchat:solarbound:'+((user&&user.id)||'guest');
 useEffect(()=>{const down=e=>{const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup',' '].includes(k))e.preventDefault();keys.current[k]=true;if(k==='escape')setPaused(v=>!v);if(k==='x'&&level%1000===0){const p=world.current.player,b=world.current;if(Math.abs(p.x-b.bossX)<155&&Math.abs(p.y-340)<170)b.bossHp-=12;}};const up=e=>{keys.current[e.key.toLowerCase()]=false};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[level]);
 useEffect(()=>{let raf;let previous=0;const draw=now=>{const c=canvas.current;if(!c){raf=requestAnimationFrame(draw);return}const ctx=c.getContext('2d'),scale=Math.min(c.width/WIDTH,c.height/HEIGHT),offsetX=(c.width-WIDTH*scale)/2,offsetY=(c.height-HEIGHT*scale)/2;ctx.clearRect(0,0,c.width,c.height);ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
 // Warm pixel-art sunrise sky, inspired by the supplied floating-island reference.
 const sky=ctx.createLinearGradient(0,0,0,HEIGHT);sky.addColorStop(0,'#f7c77e');sky.addColorStop(.45,'#ffe79a');sky.addColorStop(.78,'#fff4bb');sky.addColorStop(1,'#e9b76f');ctx.fillStyle=sky;ctx.fillRect(0,0,WIDTH,HEIGHT);
 // Sun glow and distant floating ruins.
 const glow=ctx.createRadialGradient(530,275,12,530,275,310);glow.addColorStop(0,'rgba(255,255,225,.95)');glow.addColorStop(.55,'rgba(255,241,170,.45)');glow.addColorStop(1,'rgba(255,222,145,0)');ctx.fillStyle=glow;ctx.fillRect(170,0,650,HEIGHT);
 ctx.fillStyle='#fff2c2';ctx.beginPath();ctx.arc(530,270,66,0,Math.PI*2);ctx.fill();
 for(let i=0;i<17;i++){const x=((i*89-world.current.player.x*.11)%1100+1100)%1100-70,y=20+(i*47)%205,w=65+(i*23)%100;ctx.fillStyle=i%2?'rgba(230,172,111,.24)':'rgba(255,247,196,.45)';ctx.beginPath();ctx.ellipse(x,y,w,15+(i%4)*5,0,0,Math.PI*2);ctx.fill();}
 // Tiny distant floating island silhouettes.
 const island=(x,y,w)=>{ctx.fillStyle='#bd8c70';ctx.fillRect(x,y,w,24);ctx.fillRect(x+12,y+24,w-24,13);ctx.fillRect(x+w*.28,y+37,w*.44,12);ctx.fillRect(x+w*.38,y+49,w*.24,15);ctx.fillStyle='#d7a17b';ctx.fillRect(x+8,y-5,w-16,7);};
 island(300,170,125);island(680,115,75);island(810,188,92);
 // Sunbeams.
 ctx.strokeStyle='rgba(255,255,235,.48)';ctx.lineWidth=2;for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(i*145+30,0);ctx.lineTo(i*145-90,HEIGHT);ctx.stroke();}
 const g=world.current,p=g.player,dt=Math.min((now-previous)/1000||0.016,0.033);previous=now;
 if(!paused&&!over&&!won){
  const k=keys.current;let ax=(k.d||k.arrowright?1:0)-(k.a||k.arrowleft?1:0);p.vx=ax*245;
  if((k[' ']||k.w||k.arrowup)&&p.grounded){p.vy=-550;p.grounded=false;}
  p.vy+=1350*dt;const oldY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.grounded=false;
  for(const plat of g.platforms)if(p.vy>=0&&p.x+30>plat.x&&p.x+5<plat.x+plat.w&&oldY+34<=plat.y+8&&p.y+34>=plat.y){p.y=plat.y-34;p.vy=0;p.grounded=true;}
  if(p.y>HEIGHT+60){setLives(v=>{if(v<=1)setOver(true);return Math.max(0,v-1)});world.current=makeLevel(level);}
  g.coins.forEach(c=>{if(!c.taken&&Math.hypot(p.x+16-c.x,p.y+15-c.y)<25){c.taken=true;setCoins(v=>v+1)}});
  g.spikes.forEach(s=>{s.phase+=dt*s.speed;s.y=s.baseY+Math.sin(s.phase)*s.amplitude;});
  if(g.spikes.some(s=>p.invulnerable<=0&&p.x+26>s.x&&p.x+5<s.x+s.w&&p.y+30>s.y&&p.y+4<s.y+s.h)){p.invulnerable=1.1;setLives(v=>{if(v<=1)setOver(true);return Math.max(0,v-1)});}
  g.enemies.forEach(e=>{if(!e.alive)return;e.x+=e.dir*(65+level%35)*dt;if(e.x<e.x-999)e.dir=1;if(e.x<280||e.x>840)e.dir*=-1;if(Math.abs(p.x-e.x)<29&&Math.abs(p.y-e.y)<30){if(p.vy>80&&p.y<e.y){e.alive=false;p.vy=-300;setCoins(v=>v+2)}else if(p.invulnerable<=0){p.invulnerable=1.2;setLives(v=>{if(v<=1)setOver(true);return Math.max(0,v-1)})}}});
  p.invulnerable=Math.max(0,p.invulnerable-dt);
  if(level%1000===0){g.bossTime+=dt;g.bossX=650+Math.sin(g.bossTime*1.5)*115;if(g.bossHp<=0){const next=level+1;setLevel(next);setBest(v=>Math.max(v,next));try{localStorage.setItem(storeKey,String(next))}catch{}world.current=makeLevel(next);world.current.player.x=25;}}
  else if(level%1000!==0&&p.x>WIDTH-45){const next=level+1;setLevel(next);setBest(v=>Math.max(v,next));try{localStorage.setItem(storeKey,String(Math.max(best,next)))}catch{}world.current=makeLevel(next);world.current.player.x=25;}
 }
 // platforms and coins
 g.platforms.forEach((pl,idx)=>{ // chunky floating rock islands with autumn grass
 ctx.fillStyle='#102d3c';ctx.beginPath();ctx.moveTo(pl.x,pl.y+8);ctx.lineTo(pl.x+pl.w,pl.y+8);ctx.lineTo(pl.x+pl.w-10,pl.y+pl.h*.62);ctx.lineTo(pl.x+pl.w*.72,pl.y+pl.h);ctx.lineTo(pl.x+pl.w*.25,pl.y+pl.h*.84);ctx.lineTo(pl.x+5,pl.y+pl.h*.5);ctx.closePath();ctx.fill();
 ctx.fillStyle='#b54d32';ctx.fillRect(pl.x,pl.y,pl.w,9);ctx.fillStyle='#df713d';for(let q=0;q<Math.floor(pl.w/13);q++){ctx.fillRect(pl.x+q*13,pl.y-2+(q%3)*2,8,5);ctx.fillStyle=q%2?'#a94732':'#e38a45';}
 ctx.fillStyle='#315264';for(let q=0;q<Math.floor(pl.w/35);q++)ctx.fillRect(pl.x+q*35+8,pl.y+19,18,8);
 });
 g.spikes.forEach(s=>{ctx.fillStyle='#7f2532';ctx.beginPath();ctx.moveTo(s.x,s.y+s.h);ctx.lineTo(s.x+s.w/2,s.y);ctx.lineTo(s.x+s.w,s.y+s.h);ctx.closePath();ctx.fill();ctx.fillStyle='#ff9b68';ctx.fillRect(s.x+s.w/2-2,s.y+8,4,9);});
 g.coins.forEach(c=>{if(c.taken)return;ctx.fillStyle='#ffdf66';ctx.shadowColor='#ffc83d';ctx.shadowBlur=13;ctx.beginPath();ctx.ellipse(c.x,c.y,8,12,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff3b4';ctx.fillRect(c.x-1,c.y-6,2,12)});
 if(level%1000!==0)g.enemies.forEach(e=>{if(!e.alive)return;ctx.fillStyle='#9b3f2d';ctx.fillRect(e.x+3,e.y+7,22,20);ctx.fillRect(e.x,e.y+12,28,12);ctx.fillStyle='#f8d36b';ctx.fillRect(e.x+7,e.y+11,4,4);ctx.fillRect(e.x+18,e.y+11,4,4);ctx.fillStyle='#422a27';ctx.fillRect(e.x+8,e.y+12,2,2);ctx.fillRect(e.x+19,e.y+12,2,2);ctx.fillStyle='#71362b';ctx.fillRect(e.x+5,e.y+25,6,5);ctx.fillRect(e.x+19,e.y+25,6,5);});
 // Pixel-art adventurer: teal hood, crimson scarf, dark tunic and bright boots.
 if(p.invulnerable<=0||Math.floor(now/100)%2===0){
  const hx=Math.round(p.x),hy=Math.round(p.y);
  ctx.fillStyle='#143d4a';ctx.fillRect(hx+7,hy+2,19,13);ctx.fillStyle='#276b72';ctx.fillRect(hx+4,hy+7,24,12);
  ctx.fillStyle='#e5c17a';ctx.fillRect(hx+12,hy+5,10,9);ctx.fillStyle='#182a35';ctx.fillRect(hx+13,hy+8,3,3);ctx.fillRect(hx+20,hy+8,3,3);
  ctx.fillStyle='#b63e38';ctx.fillRect(hx+3,hy+15,26,7);ctx.fillStyle='#e05b42';ctx.fillRect(hx+8,hy+21,17,7);
  ctx.fillStyle='#233b47';ctx.fillRect(hx+8,hy+26,6,5);ctx.fillRect(hx+20,hy+26,6,5);
  ctx.fillStyle='#3bc1c0';ctx.fillRect(hx+5,hy+30,10,4);ctx.fillRect(hx+19,hy+30,10,4);
  ctx.fillStyle='#d9a75e';ctx.fillRect(hx+8,hy,15,3);ctx.fillStyle='#2a6871';ctx.fillRect(hx+5,hy-3,18,5);
  // flowing scarf pixels
  ctx.fillStyle='#bd3e35';ctx.fillRect(hx-9,hy+14,14,4);ctx.fillRect(hx-16,hy+11,9,4);
 }
 if(level%1000===0){ctx.fillStyle='rgba(255,130,40,.25)';ctx.beginPath();ctx.arc(g.bossX+45,350,78,0,Math.PI*2);ctx.fill();ctx.fillStyle='#bd4a2f';ctx.fillRect(g.bossX,290,90,145);ctx.fillStyle='#ffd36a';ctx.beginPath();ctx.arc(g.bossX+45,325,30,0,Math.PI*2);ctx.fill();ctx.fillStyle='#54231c';ctx.fillRect(g.bossX+31,319,5,7);ctx.fillRect(g.bossX+54,319,5,7);ctx.fillStyle='#ffd36a';ctx.beginPath();ctx.moveTo(g.bossX+8,298);ctx.lineTo(g.bossX+15,260);ctx.lineTo(g.bossX+35,297);ctx.fill();ctx.beginPath();ctx.moveTo(g.bossX+54,297);ctx.lineTo(g.bossX+76,260);ctx.lineTo(g.bossX+82,298);ctx.fill();ctx.fillStyle='#4b2022';ctx.fillRect(600,35,280,15);ctx.fillStyle='#ff7838';ctx.fillRect(600,35,280*Math.max(0,g.bossHp/100),15);ctx.fillStyle='#fff0b0';ctx.font='bold 17px system-ui';ctx.fillText('SUN WARRIOR',680,27);}
 ctx.restore();
 ctx.fillStyle='rgba(25,48,55,.82)';ctx.fillRect(14,14,230,76);ctx.fillStyle='#f6d779';ctx.fillRect(14,14,230,4);ctx.fillStyle='#ffe5a0';ctx.font='bold 21px monospace';ctx.fillText('LEVEL '+level+' · INFINITE',28,42);ctx.fillStyle='#fff5d4';ctx.font='14px monospace';ctx.fillText('SUN COINS  '+coins,28,66);ctx.fillText('LIVES  '+lives,145,66);
 if(paused||over||won){ctx.fillStyle='rgba(5,7,19,.76)';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.textAlign='center';ctx.fillStyle='#ffe28a';ctx.font='bold 32px system-ui';ctx.fillText(won?'THE SUN WARRIOR FALLS':over?'GAME OVER':level===1000?'THE FINAL SUNRISE':'SOLARBOUND',WIDTH/2,HEIGHT/2-34);ctx.fillStyle='#f3e9dc';ctx.font='16px system-ui';ctx.fillText(won?'You conquered all 1000 levels!':over?'Your journey ends here. Restart to try again.':level===1000?'Strike with X when you are close to the Sun Warrior.':'Jump across platforms, collect sun coins, and reach the right edge.',WIDTH/2,HEIGHT/2+2);ctx.fillStyle='#ffcf57';ctx.font='bold 15px system-ui';ctx.fillText(won||over?'Press Restart to play again.':'Press Play to begin · Space/W/↑ to jump',WIDTH/2,HEIGHT/2+34);ctx.textAlign='left';}
 raf=requestAnimationFrame(draw)};raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf)},[paused,level,over,won,coins,lives,best,storeKey]);
 function start(){world.current=makeLevel(level);setPaused(false);setOver(false);setWon(false);setLives(3);if(level===1000)world.current.player.x=450;}
 function restart(){setLevel(1);setCoins(0);setLives(3);setOver(false);setWon(false);world.current=makeLevel(1);setPaused(true);keys.current={};}
 const press=(key)=>{keys.current[key]=true;setTimeout(()=>{keys.current[key]=false},160)};
 return <div className="astral-overlay"><section className="astral-shell solarbound-shell" role="dialog" aria-modal="true" aria-label="Solarbound platform game"><header className="astral-header"><button className="astral-back" onClick={onClose}><ArrowLeft size={17}/> Back to Cinder</button><div className="astral-title-mark"><span className="astral-mark"><Sparkles size={20}/></span><div><b>SOLARBOUND</b><small>A SUN-POWERED PLATFORM ADVENTURE</small></div></div><div className="astral-header-actions"><button onClick={()=>setMuted(v=>!v)} aria-label={muted?'Enable sound':'Mute sound'} title={muted?'Enable sound':'Mute sound'}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><button onClick={()=>setPaused(v=>!v)} title={paused?'Play':'Pause'}>{paused?<Play size={18}/>:<span>Ⅱ</span>}</button><button onClick={onClose} aria-label="Close game">×</button></div></header><div className="astral-content"><div className="astral-intro"><div><span className="astral-eyebrow"><Sparkles size={13}/> JUMP · EXPLORE · LEVEL UP</span><h1>Chase the sunrise. <em>Defeat the Sun Warrior.</em></h1><p>Cross procedurally remixed platform stages, collect sun coins, and survive all the way to the level 1000 boss arena.</p></div><div className="astral-record"><small>BEST LEVEL</small><b>{best.toLocaleString()} <span>/ 1000</span></b></div></div><div className="astral-hud"><div><Sparkles size={16}/><span>LEVEL</span><b>{level} / 1000</b></div><div><Shield size={16}/><span>SUN COINS</span><b>{coins}</b></div><div><Heart size={16}/><span>LIVES</span><b>{'♥ '.repeat(lives)}{'♡ '.repeat(Math.max(0,3-lives))}</b></div><div className="astral-objective">{level%1000===0?'SUN WARRIOR BOSS · PRESS X TO STRIKE':'DODGE MOVING SPIKES · REACH THE RIGHT EDGE'}</div></div><div className="astral-game-frame solarbound-frame"><canvas ref={canvas} width={WIDTH} height={HEIGHT} aria-label="Solarbound platformer. Use A and D or arrow keys to move, Space to jump, and X to attack the Sun Warrior at level 1000."/><div className="astral-mobile-controls"><div><button onTouchStart={()=>press('a')} onClick={()=>press('a')}>←</button><button onTouchStart={()=>press(' ')} onClick={()=>press(' ')}>↑</button><button onTouchStart={()=>press('d')} onClick={()=>press('d')}>→</button></div><button onClick={()=>press('x')}>⚔</button></div></div><div className="astral-bottom"><div><Sparkles size={16}/><span><b>Controls</b> A/D or arrows · Space to jump · X to strike boss</span></div><div className="astral-action-row">{paused&&!over&&!won&&<button onClick={start}><Play size={15}/> {level%1000===0?'Enter boss arena':'Play'}</button>}<button onClick={()=>setPaused(v=>!v)}><Play size={15}/> {paused?'Resume':'Pause'}</button><button onClick={restart}><RotateCcw size={15}/> Restart</button></div></div><p className="astral-disclaimer">Solarbound is an original platform adventure. It uses original geometric art and is not affiliated with Nintendo or the Mario franchise. The native C++/raylib game source is in the repository's minigame-cpp folder.</p></div></section></div>;
}
