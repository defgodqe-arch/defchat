import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Heart,MessageCircle,Plus,Upload,Volume2,VolumeX,X,LoaderCircle,Play} from 'lucide-react';
import './DoomScroll.css';

export default function DoomScroll({db,user,onClose}){
 const [videos,setVideos]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[uploading,setUploading]=useState(false),[caption,setCaption]=useState(''),[showUpload,setShowUpload]=useState(false),[muted,setMuted]=useState(true),[likes,setLikes]=useState({}),[active,setActive]=useState(0);
 const feedRef=useRef(null),fileRef=useRef(null);
 async function loadFeed(){
  setLoading(true);setError('');
  const {data,error:queryError}=await db.from('doomscroll_videos').select('id,user_id,caption,video_url,created_at,source,profiles(username,avatar_url)').eq('is_public',true).order('created_at',{ascending:false}).limit(100);
  if(queryError){setError(queryError.message+' — run supabase/migrations/20261020190000_doomscroll_videos.sql in the Supabase SQL editor.');setVideos([])}
  else setVideos(data||[]);
  setLoading(false);
 }
 useEffect(()=>{loadFeed()},[]);
 useEffect(()=>{const root=feedRef.current;if(!root)return;const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting&&entry.intersectionRatio>=0.65){const idx=Number(entry.target.dataset.index);setActive(idx);entry.target.querySelector('video')?.play().catch(()=>{});root.querySelectorAll('video').forEach(v=>{if(v!==entry.target.querySelector('video'))v.pause()})}}),{root,threshold:[0.65]});root.querySelectorAll('.doom-video-card').forEach(el=>observer.observe(el));return()=>observer.disconnect()},[videos]);
 async function uploadVideo(file){
  if(!file||!user)return;
  if(!file.type.startsWith('video/')){setError('Choose a video file.');return}
  if(file.size>150*1024*1024){setError('Videos must be 150 MB or smaller.');return}
  setUploading(true);setError('');
  try{
   const ext=(file.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'')||'mp4';
   const path=user.id+'/'+crypto.randomUUID()+'.'+ext;
   const {error:uploadError}=await db.storage.from('doomscroll-videos').upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const {data:publicData}=db.storage.from('doomscroll-videos').getPublicUrl(path);
   const {error:insertError}=await db.from('doomscroll_videos').insert({user_id:user.id,caption:caption.trim(),video_url:publicData.publicUrl,source:'user',is_public:true});
   if(insertError)throw insertError;
   setCaption('');setShowUpload(false);await loadFeed();
  }catch(e){setError(e?.message||'Upload failed. Check Supabase storage and database policies.')}
  finally{setUploading(false);if(fileRef.current)fileRef.current.value=''}
 }
 async function toggleLike(video){
  const old=!!likes[video.id];setLikes(prev=>({...prev,[video.id]:!old}));
  const {error:likeError}=old?await db.from('doomscroll_video_likes').delete().eq('video_id',video.id).eq('user_id',user.id):await db.from('doomscroll_video_likes').insert({video_id:video.id,user_id:user.id});
  if(likeError)setLikes(prev=>({...prev,[video.id]:old}));
 }
 return <div className="doom-overlay"><header className="doom-header"><button onClick={onClose} aria-label="Back to chat"><ArrowLeft/></button><div><b>Doom Scroll</b><small>Short videos · powered by Cinder</small></div><button className="doom-upload-open" onClick={()=>setShowUpload(v=>!v)}><Plus size={17}/> Upload</button><button onClick={onClose} aria-label="Close feed"><X/></button></header>
 {error&&<div className="doom-error">{error}</div>}
 {showUpload&&<form className="doom-upload-panel" onSubmit={e=>{e.preventDefault();fileRef.current?.click()}}><label>Caption<input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={300} placeholder="Add a caption…"/></label><input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" onChange={e=>uploadVideo(e.target.files?.[0])}/><button type="submit" disabled={uploading} onClick={e=>{e.preventDefault();fileRef.current?.click()}}>{uploading?<LoaderCircle className="doom-spin"/>:<Upload size={16}/>} Choose video and upload</button><small>MP4, WebM or MOV · up to 150 MB. Your video is stored in your Supabase project.</small></form>}
 {loading?<div className="doom-state"><LoaderCircle className="doom-spin"/> Loading your feed…</div>:videos.length===0?<div className="doom-state"><Play size={35}/><b>Your feed is ready for its first video</b><p>Upload a clip to start building your video library. New uploads are saved in the database and show up for everyone.</p><button onClick={()=>setShowUpload(true)}><Upload size={16}/> Upload the first video</button></div>:<div className="doom-feed" ref={feedRef}>{videos.map((v,i)=><article className="doom-video-card" data-index={i} key={v.id}><video src={v.video_url} playsInline loop muted={muted} preload={i<3?'metadata':'none'} controls={false} onClick={e=>e.currentTarget.paused?e.currentTarget.play():e.currentTarget.pause()}/><div className="doom-video-shade"/><div className="doom-video-copy"><b>@{v.profiles?.username||'Cinder creator'}</b><p>{v.caption||' '}</p><small>{v.source==='user'?'Original upload':'Featured video'}</small></div><div className="doom-video-actions"><button onClick={()=>setMuted(v=>!v)} title={muted?'Unmute':'Mute'}>{muted?<VolumeX/>:<Volume2/>}</button><button onClick={()=>toggleLike(v)} title="Like video" className={likes[v.id]?'liked':''}><Heart fill={likes[v.id]?'currentColor':'none'}/></button><small>Like</small><button title="Comments are coming soon" onClick={()=>setError('Comments are coming soon.')}><MessageCircle/></button></div><span className="doom-counter">{i+1} / {videos.length}</span></article>)}</div>}
 </div>
}
