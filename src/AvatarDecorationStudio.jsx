import React,{useEffect,useRef,useState} from 'react';
import {X,Upload,Download,Sparkles,RotateCcw} from 'lucide-react';

const STYLES=[
 {id:'halo',name:'Golden Halo',color:'#facc15',accent:'#fff4a3',emoji:'✦'},
 {id:'neon',name:'Neon Orbit',color:'#22d3ee',accent:'#c4b5fd',emoji:'✧'},
 {id:'sakura',name:'Sakura Bloom',color:'#fb7185',accent:'#fbcfe8',emoji:'✿'},
 {id:'cosmic',name:'Cosmic Ring',color:'#a78bfa',accent:'#67e8f9',emoji:'✦'},
 {id:'flame',name:'Solar Flame',color:'#fb923c',accent:'#fde047',emoji:'✦'},
 {id:'nature',name:'Emerald Vines',color:'#34d399',accent:'#a7f3d0',emoji:'❧'}
];
export default function AvatarDecorationStudio({onClose,onUseAvatar}){
 const canvasRef=useRef(null),[photo,setPhoto]=useState(null),[photoUrl,setPhotoUrl]=useState(''),[style,setStyle]=useState(STYLES[0]),[zoom,setZoom]=useState(100),[error,setError]=useState('');
 useEffect(()=>{if(!photoUrl)return;let active=true;const img=new Image();img.onload=()=>{if(!active)return;const c=canvasRef.current;if(!c)return;const ctx=c.getContext('2d');const s=c.width;c.height=s;ctx.clearRect(0,0,s,s);
 const center=s/2,r=s*.315;ctx.save();ctx.beginPath();ctx.arc(center,center,r,0,Math.PI*2);ctx.clip();const scale=Math.max((r*2)/img.width,(r*2)/img.height)*(zoom/100);const w=img.width*scale,h=img.height*scale;ctx.drawImage(img,center-w/2,center-h/2,w,h);ctx.restore();
 ctx.save();ctx.lineCap='round';ctx.shadowColor=style.color;ctx.shadowBlur=18;ctx.strokeStyle=style.color;ctx.lineWidth=7;ctx.beginPath();ctx.arc(center,center,r+9,-Math.PI*.84,Math.PI*.84);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle=style.accent;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(center,center,r+17,Math.PI*.08,Math.PI*.92);ctx.stroke();ctx.beginPath();ctx.arc(center,center,r+17,Math.PI*1.08,Math.PI*1.92);ctx.stroke();
 for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,x=center+Math.cos(a)*(r+17),y=center+Math.sin(a)*(r+17);ctx.fillStyle=i%2?style.accent:style.color;ctx.beginPath();if(style.id==='sakura'){for(let p=0;p<5;p++){const ang=p*2*Math.PI/5;ctx.lineTo(x+Math.cos(ang)*7,y+Math.sin(ang)*7)}ctx.closePath()}else{ctx.moveTo(x,y-8);ctx.lineTo(x+5,y);ctx.lineTo(x,y+8);ctx.lineTo(x-5,y);ctx.closePath()}ctx.fill();}
 if(style.id==='flame'){for(let i=0;i<12;i++){const a=i*Math.PI/6,x=center+Math.cos(a)*(r+29),y=center+Math.sin(a)*(r+29);ctx.fillStyle=i%2?style.accent:style.color;ctx.beginPath();ctx.arc(x,y,2.5+(i%3),0,Math.PI*2);ctx.fill()}}
 if(style.id==='nature'){ctx.strokeStyle=style.accent;ctx.lineWidth=2;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(center+side*(r+3),center+30);ctx.quadraticCurveTo(center+side*(r+36),center,center+side*(r+3),center-30);ctx.stroke()}}
 ctx.restore();};img.onerror=()=>setError('That image could not be opened. Try a PNG, JPG, or GIF.');img.src=photoUrl;return()=>{active=false}},[photoUrl,style,zoom]);
 useEffect(()=>()=>{if(photoUrl)URL.revokeObjectURL(photoUrl)},[photoUrl]);
 function chooseFile(e){const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){setError('Choose an image file.');return}if(f.size>12*1024*1024){setError('Please use an image under 12 MB.');return}setError('');setPhoto(f);setPhotoUrl(URL.createObjectURL(f))}
 function download(){const c=canvasRef.current;if(!photoUrl){setError('Upload an avatar first.');return}const a=document.createElement('a');a.download='defchat-avatar-decoration.png';a.href=c.toDataURL('image/png');a.click()}
 function reset(){setPhoto(null);setPhotoUrl('');setZoom(100);setStyle(STYLES[0]);setError('')}
 return <div className="modal-backdrop avatar-studio-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="avatar-studio" role="dialog" aria-modal="true" aria-label="Avatar decoration studio">
 <header className="avatar-studio-header"><div className="avatar-studio-title-icon"><Sparkles size={22}/></div><div><small>DEFGODQE CREATIVE TOOLS</small><h2>Avatar Decoration Studio</h2><p>Make a custom avatar frame and export it as a PNG.</p></div><button className="modal-close" onClick={onClose} aria-label="Close"><X size={20}/></button></header>
 <div className="avatar-studio-layout"><div className="avatar-studio-preview"><div className="avatar-studio-canvas-wrap"><canvas ref={canvasRef} width="512" height="512" aria-label="Avatar preview"/></div><p>{photo?'Live preview · your image stays on this device':'Upload an image to preview your decoration'}</p><div className="avatar-studio-actions"><label className="avatar-studio-upload"><Upload size={16}/> {photo?'Change image':'Upload avatar'}<input type="file" accept="image/*" onChange={chooseFile}/></label><button className="primary" onClick={download}><Download size={16}/> Download PNG</button></div>{error&&<div className="notice error-notice">{error}</div>}</div>
 <div className="avatar-studio-controls"><h3>Choose a decoration</h3><div className="avatar-style-grid">{STYLES.map(s=><button key={s.id} className={style.id===s.id?'avatar-style selected':'avatar-style'} onClick={()=>setStyle(s)}><span style={{'--style-color':s.color,'--style-accent':s.accent}}>{s.emoji}</span><b>{s.name}</b></button>)}</div><label className="avatar-zoom-control">Avatar zoom <b>{zoom}%</b><input type="range" min="70" max="150" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><div className="avatar-studio-tip">Tip: a square, high-quality image gives the cleanest result. Decorations are drawn in your browser; your photo is not uploaded.</div><button className="avatar-studio-reset" onClick={reset}><RotateCcw size={15}/> Reset studio</button></div></div>
 <footer className="avatar-studio-footer">Independent defchat tool inspired by avatar decoration makers. Not affiliated with Discord or AvatarDecoration.com.</footer>
 </section></div>
}
