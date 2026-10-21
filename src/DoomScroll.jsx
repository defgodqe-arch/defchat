import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Heart,MessageCircle,Plus,Upload,Volume2,VolumeX,X,LoaderCircle,Play,Search,Sparkles} from 'lucide-react';
import './DoomScroll.css';

export default function DoomScroll({db,user,onClose}){
 const [videos,setVideos]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[uploading,setUploading]=useState(false),[caption,setCaption]=useState(''),[showUpload,setShowUpload]=useState(false),[muted,setMuted]=useState(true),[likes,setLikes]=useState({}),[active,setActive]=useState(0),[searchText,setSearchText]=useState(''),[searching,setSearching]=useState(false),[searchActive,setSearchActive]=useState(false),[searchNote,setSearchNote]=useState('');
 const feedRef=useRef(null),fileRef=useRef(null),hfOffsetRef=useRef(0),hfLoadingRef=useRef(false),hfHasMoreRef=useRef(true),allVideosRef=useRef([]);
 function shuffleVideos(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
 function isLikelyEnglish(row){const text=String(row?.description||row?.transcript||'').toLowerCase().replace(/https?:\/\/\S+/g,' ').trim();if(text.length<12)return false;const words=text.match(/[a-z]+/g)||[];if(words.length<3)return false;const common=new Set(['the','and','you','youre','your','that','this','with','for','are','was','have','what','when','how','not','but','they','them','just','like','from','its','im','ive','we','our','can','will','all','one','out','get','got','about','because','really','know','then','there','here','look','video']);const hits=words.filter(w=>common.has(w)).length;const latin= (text.match(/[a-z]/g)||[]).length;const letters=(text.match(/[a-z\p{L}]/gu)||[]).length;return latin/Math.max(1,letters)>0.75&&(hits>=1||words.length>=8)}\n function mapHfRows(rows){return (rows||[]).filter(({row})=>isLikelyEnglish(row)).map(({row},i)=>{const asset=row?.video;const url=typeof asset==='string'?asset:(asset?.src||asset?.url||'');if(!url||!/^https:\/\//i.test(url))return null;return {id:'hf-'+String(row.video_id??(hfOffsetRef.current+i)),user_id:null,caption:row.description||row.transcript||'',video_url:url,created_at:row.date_posted||null,source:'huggingface',feedSource:'huggingface',external_url:row.web_url||'',profiles:{username:row.creator||'Hugging Face creator',avatar_url:null}}}).filter(Boolean)}
 async function fetchHfPage(offset){const endpoint='https://datasets-server.huggingface.co/rows?dataset=Shofo%2Fshofo-tiktok-general-small&config=default&split=train&offset='+offset+'&length=100';const response=await fetch(endpoint);if(!response.ok)throw new Error('Hugging Face dataset returned HTTP '+response.status);const payload=await response.json();const rows=payload.rows||[];hfOffsetRef.current=offset+rows.length;hfHasMoreRef.current=rows.length>0&&hfOffsetRef.current<(payload.num_rows_total||58000);return mapHfRows(rows)}
 async function loadMoreHf(){if(hfLoadingRef.current||!hfHasMoreRef.current)return;hfLoadingRef.current=true;try{const next=await fetchHfPage(hfOffsetRef.current);setVideos(prev=>{const seen=new Set(prev.map(v=>v.id));const combined=[...prev,...shuffleVideos(next.filter(v=>!seen.has(v.id)))];allVideosRef.current=combined;return combined})}catch(e){setError('More English-language videos could not load: '+(e?.message||'request failed'))}finally{hfLoadingRef.current=false}}
 async function loadFeed(){
  setLoading(true);setError('');
  let localRows=[];
  try{
   const {data,error:queryError}=await db.from('doomscroll_videos').select('id,user_id,caption,video_url,created_at,source').eq('is_public',true).order('created_at',{ascending:false}).limit(100);
   if(queryError)throw queryError;
   const rows=data||[];
   const ids=[...new Set(rows.map(v=>v.user_id).filter(Boolean))];
   let profileMap={};
   if(ids.length){const {data:profiles}=await db.from('profiles').select('id,username,avatar_url').in('id',ids);(profiles||[]).forEach(p=>{profileMap[p.id]=p})}
   localRows=rows.map(v=>({...v,profiles:profileMap[v.user_id]||null,feedSource:'local'}));
  }catch(e){setError('Your uploads could not be loaded: '+(e?.message||'database error'))}
  try{
   // Stream the public dataset in pages; signed asset URLs are refreshed when each page is requested.
   hfHasMoreRef.current=true;
   const randomStart=Math.floor(Math.random()*Math.max(1,58000-100));
   const imported=await fetchHfPage(randomStart);
   const seen=new Set(localRows.map(v=>v.video_url));
   const combined=shuffleVideos([...localRows,...imported.filter(v=>!seen.has(v.video_url))]);allVideosRef.current=combined;setVideos(combined);
   if(!imported.length&&!localRows.length)setError('No playable videos were returned. Try again later or upload a video.');
  }catch(e){setVideos(localRows);setError(prev=>(prev?prev+' · ':'')+'English-language video source unavailable: '+(e?.message||'request failed')+'. Your own uploaded videos still work.')}
  setLoading(false);
 }
 useEffect(()=>{loadFeed()},[]);
 useEffect(()=>{const root=feedRef.current;if(!root)return;const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting&&entry.intersectionRatio>=0.65){const idx=Number(entry.target.dataset.index);setActive(idx);entry.target.querySelector('video')?.play().catch(()=>{});if(idx>=videos.length-5)loadMoreHf();root.querySelectorAll('video').forEach(v=>{if(v!==entry.target.querySelector('video'))v.pause()})}}),{root,threshold:[0.65]});root.querySelectorAll('.doom-video-card').forEach(el=>observer.observe(el));return()=>observer.disconnect()},[videos]);
 async function searchSimilarVideos(event){
  event.preventDefault();const query=searchText.trim();
  if(!query){clearVideoSearch();return}
  setSearching(true);setSearchNote('AI is finding videos with similar topics…');setError('');
  let terms=[query];
  try{
   const api=(import.meta.env.VITE_DEFGODQE_AI_API||'https://ai.defgodqe.workers.dev').replace(/\/+$/,'');
   const response=await fetch(api+'/chat',{method:'POST',headers:{'Content-Type':'application/json','X-Defgodqe-Client':'defchat-web'},body:JSON.stringify({messages:[{role:'system',content:'Return only JSON: {"terms":["phrase"]}. Expand the user query into 6 short related video search phrases, synonyms, topics, and visual concepts.'},{role:'user',content:query}],stream:false})});
   if(response.ok){const data=await response.json();const raw=String(data.reply||data.response||data.content||data.choices?.[0]?.message?.content||'');const parsed=JSON.parse(raw.replace(/```json|```/g,''));if(Array.isArray(parsed.terms))terms=[query,...parsed.terms.map(String).slice(0,8)]}
  }catch(e){/* Keep local search available if AI expansion is offline. */}
  const tokens=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2);
  const allTerms=terms.map(tokens);
  const ranked=allVideosRef.current.map(v=>{const words=tokens(String(v.caption||'')+' '+String(v.profiles?.username||''));let score=0;for(const t of allTerms){const hits=t.filter(w=>words.includes(w)).length;score=Math.max(score,hits/Math.max(1,t.length))}return {v,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  setVideos(ranked.map(x=>x.v));setSearchActive(true);setSearchNote(ranked.length?'Found '+ranked.length+' related videos.':'No close caption matches found. Try a broader search or load more videos.');
  if(feedRef.current)feedRef.current.scrollTop=0;setSearching(false);
 }
 function clearVideoSearch(){setSearchText('');setSearchActive(false);setSearchNote('');setVideos(allVideosRef.current);if(feedRef.current)feedRef.current.scrollTop=0}
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
  if(video.feedSource==='huggingface')return; // External dataset IDs are not rows in the app's UUID-keyed likes table.
  if(!user){setLikes(prev=>({...prev,[video.id]:old}));setError('Sign in to like videos.');return}
  const {error:likeError}=old?await db.from('doomscroll_video_likes').delete().eq('video_id',video.id).eq('user_id',user.id):await db.from('doomscroll_video_likes').insert({video_id:video.id,user_id:user.id});
  if(likeError)setLikes(prev=>({...prev,[video.id]:old}));
 }
 return <div className="doom-overlay"><header className="doom-header"><button onClick={onClose} aria-label="Back to chat"><ArrowLeft/></button><div><b>Doom Scroll</b><small>AI-powered video discovery · powered by Cinder</small></div><button className="doom-upload-open" onClick={()=>setShowUpload(v=>!v)}><Plus size={17}/> Upload</button><button onClick={onClose} aria-label="Close feed"><X/></button></header>
 {error&&<div className="doom-error">{error}</div>}
 <form className="doom-search-bar" onSubmit={searchSimilarVideos}><Search size={19}/><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Search videos with AI… try cats, gaming, cooking" aria-label="Search Doom Scroll videos"/><button type="submit" disabled={searching}>{searching?<LoaderCircle className="doom-spin" size={17}/>:<Sparkles size={17}/>} {searching?'Searching':'AI Search'}</button>{searchActive&&<button type="button" className="doom-search-clear" onClick={clearVideoSearch}>Clear</button>}</form>{searchNote&&<div className="doom-search-note">{searchNote}</div>}
 {showUpload&&<form className="doom-upload-panel" onSubmit={e=>{e.preventDefault();fileRef.current?.click()}}><label>Caption<input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={300} placeholder="Add a caption…"/></label><input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" onChange={e=>uploadVideo(e.target.files?.[0])}/><button type="submit" disabled={uploading} onClick={e=>{e.preventDefault();fileRef.current?.click()}}>{uploading?<LoaderCircle className="doom-spin"/>:<Upload size={16}/>} Choose video and upload</button><small>MP4, WebM or MOV · up to 150 MB. Your video is stored in your Supabase project.</small></form>}
 {loading?<div className="doom-state"><LoaderCircle className="doom-spin"/> Loading your feed…</div>:videos.length===0?<div className="doom-state"><Play size={35}/><b>Your feed is ready for its first video</b><p>Upload a clip to start building your video library. New uploads are saved in the database and show up for everyone.</p><button onClick={()=>setShowUpload(true)}><Upload size={16}/> Upload the first video</button></div>:<div className="doom-feed" ref={feedRef}>{videos.map((v,i)=><article className="doom-video-card" data-index={i} key={v.id}><video src={v.video_url} playsInline loop muted={muted} preload={i<3?'metadata':'none'} controls={false} onClick={e=>e.currentTarget.paused?e.currentTarget.play():e.currentTarget.pause()}/><div className="doom-video-shade"/><div className="doom-video-copy"><b>@{v.profiles?.username||'Cinder creator'}</b><p>{v.caption||' '}</p><small>{v.feedSource==='huggingface'?'English-filtered dataset · source video may be subject to creator rights':v.source==='user'?'Original upload':'Featured video'}</small></div><div className="doom-video-actions"><button onClick={()=>setMuted(v=>!v)} title={muted?'Unmute':'Mute'}>{muted?<VolumeX/>:<Volume2/>}</button><button onClick={()=>toggleLike(v)} title={v.feedSource==='huggingface'?'Preview like (not saved)':'Like video'} className={likes[v.id]?'liked':''}><Heart fill={likes[v.id]?'currentColor':'none'}/></button><small>Like</small><button title={v.external_url?'Open original source':'Comments are coming soon'} onClick={()=>v.external_url?window.open(v.external_url,'_blank','noopener,noreferrer'):setError('Comments are coming soon.')}><MessageCircle/></button></div><span className="doom-counter">{i+1} / {videos.length}</span></article>)}</div>}
 </div>
}
