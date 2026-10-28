import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Heart,MessageCircle,Plus,Upload,Volume2,VolumeX,X,LoaderCircle,Play,Search,Sparkles,Bookmark,UserPlus,Flag,Send,Trash2,Check} from 'lucide-react';
import './DoomScroll.css';

export default function DoomScroll({db,user,onClose}){
 const [videos,setVideos]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[uploading,setUploading]=useState(false),[caption,setCaption]=useState(''),[showUpload,setShowUpload]=useState(false),[muted,setMuted]=useState(true),[likes,setLikes]=useState({}),[active,setActive]=useState(0),[searchText,setSearchText]=useState(''),[searching,setSearching]=useState(false),[searchActive,setSearchActive]=useState(false),[searchNote,setSearchNote]=useState(''),[viewMode,setViewMode]=useState('home'),[watchVideo,setWatchVideo]=useState(null),[category,setCategory]=useState('All');
 const [following,setFollowing]=useState([]),[saved,setSaved]=useState([]),[feedTab,setFeedTab]=useState('for-you'),[commentsFor,setCommentsFor]=useState(null),[comments,setComments]=useState([]),[commentDraft,setCommentDraft]=useState(''),[commentsLoading,setCommentsLoading]=useState(false),[socialBusy,setSocialBusy]=useState(false);
 const feedRef=useRef(null),fileRef=useRef(null),hfOffsetRef=useRef(0),hfLoadingRef=useRef(false),hfHasMoreRef=useRef(true),allVideosRef=useRef([]);
 const searchIndexRef=useRef([]),searchIndexIdsRef=useRef(new Set()),indexingRef=useRef(false),indexCompleteRef=useRef(false);
 function shuffleVideos(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
 function isLikelyEnglish(row){const text=String(row?.description||row?.transcript||'').toLowerCase().replace(/https?:\/\/\S+/g,' ').trim();if(text.length<12)return false;const words=text.match(/[a-z]+/g)||[];if(words.length<3)return false;const common=new Set(['the','and','you','youre','your','that','this','with','for','are','was','have','what','when','how','not','but','they','them','just','like','from','its','im','ive','we','our','can','will','all','one','out','get','got','about','because','really','know','then','there','here','look','video']);const hits=words.filter(w=>common.has(w)).length;return hits>=1||words.length>=8}
 function mapHfRows(rows,baseOffset=hfOffsetRef.current){return (rows||[]).filter(({row})=>isLikelyEnglish(row)).map(({row},i)=>{const asset=row?.video;const url=typeof asset==='string'?asset:(asset?.src||asset?.url||'');if(!url||!/^https:\/\//i.test(url))return null;return {id:'hf-'+String(row.video_id??(baseOffset+i)),user_id:null,caption:row.description||row.transcript||'',video_url:url,created_at:row.date_posted||null,source:'huggingface',feedSource:'huggingface',external_url:row.web_url||'',profiles:{username:row.creator||'Hugging Face creator',avatar_url:null}}}).filter(Boolean)}
 async function fetchHfPage(offset){const endpoint='https://datasets-server.huggingface.co/rows?dataset=Shofo%2Fshofo-tiktok-general-small&config=default&split=train&offset='+offset+'&length=100';const response=await fetch(endpoint);if(!response.ok)throw new Error('Hugging Face dataset returned HTTP '+response.status);const payload=await response.json();const rows=payload.rows||[];hfOffsetRef.current=offset+rows.length;hfHasMoreRef.current=rows.length>0&&hfOffsetRef.current<(payload.num_rows_total||58000);return mapHfRows(rows)}
 async function buildBackgroundSearchIndex(){
  // Hugging Face rate-limits large client-side crawls. Use its server-side
  // search endpoint on demand instead of issuing hundreds of /rows requests.
  indexingRef.current=false;
  indexCompleteRef.current=false;
 }
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
 useEffect(()=>{if(!user?.id)return;let cancelled=false;(async()=>{try{const [f,s]=await Promise.all([db.from('doomscroll_follows').select('creator_id').eq('follower_id',user.id),db.from('doomscroll_video_saves').select('video_id').eq('user_id',user.id)]);if(!cancelled){if(!f.error)setFollowing((f.data||[]).map(x=>x.creator_id));if(!s.error)setSaved((s.data||[]).map(x=>x.video_id))}}catch(e){console.warn('VYBE social state unavailable:',e)}})();return()=>{cancelled=true}},[user?.id]);
 useEffect(()=>{let cancelled=false;const start=()=>{if(!cancelled)buildBackgroundSearchIndex()};const timer=setTimeout(start,5000);return()=>{cancelled=true;clearTimeout(timer);indexingRef.current=false}},[]);
 useEffect(()=>{if(viewMode!=='shorts')return;const root=feedRef.current;if(!root)return;const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting&&entry.intersectionRatio>=0.65){const idx=Number(entry.target.dataset.index);setActive(idx);entry.target.querySelector('video')?.play().catch(()=>{});if(idx>=videos.length-5)loadMoreHf();root.querySelectorAll('video').forEach(v=>{if(v!==entry.target.querySelector('video'))v.pause()})}}),{root,threshold:[0.65]});root.querySelectorAll('.doom-video-card').forEach(el=>observer.observe(el));return()=>observer.disconnect()},[videos,viewMode]);
 async function searchSimilarVideos(event){
  event.preventDefault();const query=searchText.trim();
  if(!query){clearVideoSearch();return}
  setSearching(true);setSearchNote('Searching the full video library and remote video dataset…');setError('');
  // Avoid a cross-origin POST to the AI worker here: its current deployment does not
  // answer OPTIONS preflight requests with CORS headers. Search remains available via
  // Supabase and the Hugging Face dataset API; broaden phrases locally as a fallback.
  const terms=[query,...query.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2)].slice(0,8);
  const found=[];
  const seen=new Set();
  const addRows=rows=>(rows||[]).forEach(v=>{if(v?.video_url&&!seen.has(v.video_url)){seen.add(v.video_url);found.push(v)}});
  // Search the database itself, not only the videos already held in React state.
  try{
   const patterns=[...new Set(terms.map(t=>String(t).trim()).filter(Boolean))].slice(0,5);
   const filters=patterns.map(t=>'caption.ilike.%'+t.replace(/[,%()]/g,' ').replace(/\\s+/g,' ').trim()+'%').filter(t=>!t.endsWith('%%'));
   if(filters.length){
    const {data,error:dbError}=await db.from('doomscroll_videos').select('id,user_id,caption,video_url,created_at,source').eq('is_public',true).or(filters.join(',')).order('created_at',{ascending:false}).limit(100);
    if(dbError)throw dbError;
    const ids=[...new Set((data||[]).map(v=>v.user_id).filter(Boolean))];let profileMap={};
    if(ids.length){const {data:profiles}=await db.from('profiles').select('id,username,avatar_url').in('id',ids);(profiles||[]).forEach(p=>{profileMap[p.id]=p})}
    addRows((data||[]).map(v=>({...v,profiles:profileMap[v.user_id]||null,feedSource:'local'})));
   }
  }catch(e){setError('Some uploaded videos could not be searched: '+(e?.message||'database query failed'))}
  // Query Hugging Face's dataset search API so matching videos are fetched even when
  // they were never loaded into the feed. This searches the dataset server-side.
  for(const term of [...new Set([query,...terms.filter(t=>t.toLowerCase()!==query.toLowerCase())])].slice(0,2)){
   try{
    const endpoint='https://datasets-server.huggingface.co/search?dataset=Shofo%2Fshofo-tiktok-general-small&config=default&split=train&query='+encodeURIComponent(term)+'&columns=description,transcript,creator,video,video_id,date_posted,web_url&limit=100';
    const response=await fetch(endpoint);
    if(!response.ok)continue;
    const payload=await response.json();
    const rows=mapHfRows(payload.rows||[]);
    addRows(rows);
   }catch(e){/* Keep results from the app database and other search phrases. */}
  }
  // Rank remote and database results together; keep matching remote results cached for
  // later scrolling, while preserving the feed's existing videos.
  const tokens=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\\s]/g,' ').split(/\\s+/).filter(w=>w.length>2);
  const allTerms=terms.map(tokens);
  const candidateSeen=new Set(found.map(v=>v.video_url));const candidates=[...found,...searchIndexRef.current.filter(v=>v.video_url&&!candidateSeen.has(v.video_url)&&candidateSeen.add(v.video_url)),...allVideosRef.current.filter(v=>v.video_url&&!candidateSeen.has(v.video_url)&&candidateSeen.add(v.video_url))];
  const ranked=candidates.map(v=>{const words=tokens(String(v.caption||'')+' '+String(v.profiles?.username||''));let score=0;for(const t of allTerms){const hits=t.filter(w=>words.includes(w)).length;score=Math.max(score,hits/Math.max(1,t.length))}return {v,score}}).filter(x=>x.score>0);
  ranked.sort((a,b)=>b.score-a.score);
  const results=ranked.map(x=>x.v);
  setVideos(results);setSearchActive(true);setSearchNote(results.length?'Found '+results.length+' matching videos in your uploads and Hugging Face’s server-side dataset search.':'No videos matched that phrase in your uploads or the remote dataset. Try different words.');
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

 async function showForYou(){setFeedTab('for-you');setSearchActive(false);setSearchNote('');setVideos(allVideosRef.current);setViewMode('home');setWatchVideo(null);if(feedRef.current)feedRef.current.scrollTop=0}
 async function showFollowingFeed(){
  if(!user){setError('Sign in to see videos from creators you follow.');return}
  setSocialBusy(true);setError('');setFeedTab('following');setViewMode('home');setWatchVideo(null);
  try{const {data:f,error:fe}=await db.from('doomscroll_follows').select('creator_id').eq('follower_id',user.id);if(fe)throw fe;const ids=(f||[]).map(x=>x.creator_id);if(!ids.length){setVideos([]);setSearchNote('Follow creators from community uploads to build your Following feed.');return}
   const {data:rows,error:ve}=await db.from('doomscroll_videos').select('id,user_id,caption,video_url,created_at,source').eq('is_public',true).in('user_id',ids).order('created_at',{ascending:false}).limit(100);if(ve)throw ve;
   const profileIds=[...new Set((rows||[]).map(x=>x.user_id))];let people={};if(profileIds.length){const {data:p}=await db.from('profiles').select('id,username,avatar_url').in('id',profileIds);(p||[]).forEach(x=>people[x.id]=x)}
   const next=(rows||[]).map(v=>({...v,profiles:people[v.user_id]||null,feedSource:'local'}));allVideosRef.current=allVideosRef.current;setVideos(next);setSearchNote(next.length?'Videos from creators you follow.':'The creators you follow have not posted any videos yet.');
  }catch(e){setError(e?.message||'Could not load your Following feed.')}finally{setSocialBusy(false)}
 }
 async function showSavedFeed(){
  if(!user){setError('Sign in to view saved videos.');return}
  setSocialBusy(true);setError('');setFeedTab('saved');setViewMode('home');setWatchVideo(null);
  try{const {data:s,error:se}=await db.from('doomscroll_video_saves').select('video_id').eq('user_id',user.id).order('created_at',{ascending:false});if(se)throw se;const ids=(s||[]).map(x=>x.video_id);if(!ids.length){setVideos([]);setSearchNote('Videos you bookmark will appear here.');return}
   const {data:rows,error:ve}=await db.from('doomscroll_videos').select('id,user_id,caption,video_url,created_at,source').in('id',ids).eq('is_public',true);if(ve)throw ve;
   const profileIds=[...new Set((rows||[]).map(x=>x.user_id))];let people={};if(profileIds.length){const {data:p}=await db.from('profiles').select('id,username,avatar_url').in('id',profileIds);(p||[]).forEach(x=>people[x.id]=x)}
   const order=new Map(ids.map((id,i)=>[id,i]));const next=(rows||[]).map(v=>({...v,profiles:people[v.user_id]||null,feedSource:'local'})).sort((a,b)=>(order.get(a.id)??9999)-(order.get(b.id)??9999));setVideos(next);setSearchNote(next.length?'Your saved community videos.':'No saved videos yet.');
  }catch(e){setError(e?.message||'Could not load saved videos.')}finally{setSocialBusy(false)}
 }
 async function toggleFollow(video){
  if(!user){setError('Sign in to follow creators.');return}if(!video?.user_id||video.feedSource==='huggingface'){setError('You can follow creators who post to Cinder.');return}if(video.user_id===user.id){setError('You cannot follow yourself.');return}
  const was=following.includes(video.user_id);setFollowing(prev=>was?prev.filter(id=>id!==video.user_id):[...prev,video.user_id]);
  try{const result=was?await db.from('doomscroll_follows').delete().eq('follower_id',user.id).eq('creator_id',video.user_id):await db.from('doomscroll_follows').insert({follower_id:user.id,creator_id:video.user_id});if(result.error)throw result.error}
  catch(e){setFollowing(prev=>was?[...prev,video.user_id]:prev.filter(id=>id!==video.user_id));setError(e?.message||'Could not update follow.')}
 }
 async function toggleSave(video){
  if(!user){setError('Sign in to save videos.');return}if(video?.feedSource==='huggingface'||!video?.id){setError('Only Cinder community uploads can be saved.');return}
  const was=saved.includes(video.id);setSaved(prev=>was?prev.filter(id=>id!==video.id):[...prev,video.id]);
  try{const result=was?await db.from('doomscroll_video_saves').delete().eq('user_id',user.id).eq('video_id',video.id):await db.from('doomscroll_video_saves').insert({user_id:user.id,video_id:video.id});if(result.error)throw result.error}
  catch(e){setSaved(prev=>was?[...prev,video.id]:prev.filter(id=>id!==video.id));setError(e?.message||'Could not save this video.')}
 }
 async function openComments(video){
  if(video?.feedSource==='huggingface'){setError('Comments are available on Cinder community uploads.');return}
  setCommentsFor(video);setComments([]);setCommentsLoading(true);setCommentDraft('');
  try{const {data:rows,error:ce}=await db.from('doomscroll_video_comments').select('id,user_id,body,created_at').eq('video_id',video.id).order('created_at',{ascending:true}).limit(100);if(ce)throw ce;const ids=[...new Set((rows||[]).map(x=>x.user_id))];let people={};if(ids.length){const {data:p}=await db.from('profiles').select('id,username,avatar_url').in('id',ids);(p||[]).forEach(x=>people[x.id]=x)}setComments((rows||[]).map(c=>({...c,profile:people[c.user_id]||null})))}
  catch(e){setError(e?.message||'Could not load comments.')}finally{setCommentsLoading(false)}
 }
 async function addComment(event){
  event.preventDefault();const body=commentDraft.trim();if(!body||!commentsFor)return;if(!user){setError('Sign in to comment.');return}
  setSocialBusy(true);try{const {error:ce}=await db.from('doomscroll_video_comments').insert({video_id:commentsFor.id,user_id:user.id,body:body.slice(0,1000)});if(ce)throw ce;setCommentDraft('');await openComments(commentsFor)}catch(e){setError(e?.message||'Could not post comment.')}finally{setSocialBusy(false)}
 }
 async function deleteComment(comment){if(!user||comment.user_id!==user.id)return;const {error:ce}=await db.from('doomscroll_video_comments').delete().eq('id',comment.id).eq('user_id',user.id);if(ce)setError(ce.message);else setComments(prev=>prev.filter(c=>c.id!==comment.id))}
 async function reportVideo(video){
  if(!user){setError('Sign in to report a video.');return}if(video?.feedSource==='huggingface'){setError('Use the original source page to report this external clip.');return}
  const reason=window.prompt('Why are you reporting this video? (spam, harassment, unsafe content, or other)');if(!reason?.trim())return;
  const {error:re}=await db.from('doomscroll_video_reports').insert({video_id:video.id,reporter_id:user.id,reason:reason.trim().slice(0,300)});if(re)setError(re.message);else setSearchNote('Thanks. Your report was submitted for review.');
 }

 return <div className="doom-overlay"><header className="doom-header"><button onClick={onClose} aria-label="Back to chat"><ArrowLeft/></button><div><b>Cinder Video</b><small>Discover videos from Hugging Face and the Cinder community</small></div><nav className="video-mode-tabs"><button type="button" className={viewMode==='home'?'selected':''} onClick={()=>{setViewMode('home');setWatchVideo(null)}}>Home</button><button type="button" className={viewMode==='shorts'?'selected':''} onClick={()=>{setViewMode('shorts');setWatchVideo(null)}}><Play size={15}/> Shorts</button></nav><button className="doom-upload-open" onClick={()=>setShowUpload(v=>!v)}><Plus size={17}/> Upload</button><button onClick={onClose} aria-label="Close feed"><X/></button></header>
 {error&&<div className="doom-error">{error}</div>}
 <form className="doom-search-bar" onSubmit={searchSimilarVideos}><Search size={19}/><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Search videos with AI… try cats, gaming, cooking" aria-label="Search Doom Scroll videos"/><button type="submit" disabled={searching}>{searching?<LoaderCircle className="doom-spin" size={17}/>:<Sparkles size={17}/>} {searching?'Searching':'AI Search'}</button>{searchActive&&<button type="button" className="doom-search-clear" onClick={clearVideoSearch}>Clear</button>}</form>{searchNote&&<div className="doom-search-note">{searchNote}</div>}
 {showUpload&&<form className="doom-upload-panel" onSubmit={e=>{e.preventDefault();fileRef.current?.click()}}><label>Caption<input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={300} placeholder="Add a caption…"/></label><input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" onChange={e=>uploadVideo(e.target.files?.[0])}/><button type="submit" disabled={uploading} onClick={e=>{e.preventDefault();fileRef.current?.click()}}>{uploading?<LoaderCircle className="doom-spin"/>:<Upload size={16}/>} Choose video and upload</button><small>MP4, WebM or MOV · up to 150 MB. Your video is stored in your Supabase project.</small></form>}
 {loading?<div className="doom-state"><LoaderCircle className="doom-spin"/> Loading your video library…</div>:videos.length===0?<div className="doom-state"><Play size={35}/><b>Your video library is ready for its first upload</b><p>Browse public dataset clips or upload a video to build the Cinder community library.</p><button onClick={()=>setShowUpload(true)}><Upload size={16}/> Upload the first video</button></div>:viewMode==='shorts'?<div className="doom-feed" ref={feedRef}>{videos.map((v,i)=><article className="doom-video-card" data-index={i} key={v.id}><video src={v.video_url} playsInline loop muted={muted} preload={i<3?'metadata':'none'} controls={false} onClick={e=>e.currentTarget.paused?e.currentTarget.play():e.currentTarget.pause()}/><div className="doom-video-shade"/><div className="doom-video-copy"><b>@{v.profiles?.username||'Cinder creator'}</b><p>{v.caption||' '}</p></div><div className="doom-video-actions"><button onClick={()=>setMuted(v=>!v)} title={muted?'Unmute':'Mute'}>{muted?<VolumeX/>:<Volume2/>}</button><button onClick={()=>toggleLike(v)} title={v.feedSource==='huggingface'?'Preview like (not saved)':'Like video'} className={likes[v.id]?'liked':''}><Heart fill={likes[v.id]?'currentColor':'none'}/></button><small>Like</small><button title="Comments" onClick={()=>openComments(v)}><MessageCircle/></button><button title={saved.includes(v.id)?'Remove saved video':'Save video'} className={saved.includes(v.id)?'liked':''} onClick={()=>toggleSave(v)}><Bookmark fill={saved.includes(v.id)?'currentColor':'none'}/></button><button title={following.includes(v.user_id)?'Unfollow creator':'Follow creator'} disabled={!v.user_id||v.feedSource==='huggingface'} onClick={()=>toggleFollow(v)}><UserPlus/></button><button title="Report video" onClick={()=>reportVideo(v)}><Flag/></button></div><span className="doom-counter">{i+1} / {videos.length}</span></article>)}</div>:watchVideo?<main className="video-watch-layout"><section className="video-watch-main"><div className="video-player-frame"><video key={watchVideo.id} src={watchVideo.video_url} controls autoPlay playsInline /></div><h2>{watchVideo.caption||'Community video'}</h2><div className="video-watch-meta"><b>@{watchVideo.profiles?.username||'Cinder creator'}</b><button className={likes[watchVideo.id]?'liked':''} onClick={()=>toggleLike(watchVideo)}><Heart size={17} fill={likes[watchVideo.id]?'currentColor':'none'}/> Like</button><button className={saved.includes(watchVideo.id)?'liked':''} onClick={()=>toggleSave(watchVideo)}><Bookmark size={16} fill={saved.includes(watchVideo.id)?'currentColor':'none'}/> Save</button><button onClick={()=>openComments(watchVideo)}><MessageCircle size={16}/> Comments</button><button onClick={()=>toggleFollow(watchVideo)} disabled={!watchVideo.user_id||watchVideo.feedSource==='huggingface'}><UserPlus size={16}/> {following.includes(watchVideo.user_id)?'Following':'Follow'}</button><button onClick={()=>reportVideo(watchVideo)}><Flag size={16}/> Report</button><button onClick={()=>{setWatchVideo(null);setViewMode('home')}}>Back to videos</button></div><p className="video-description">Video from {watchVideo.feedSource==='huggingface'?'the Hugging Face public video dataset':'the Cinder community'}{watchVideo.external_url?' · ':'.'} {watchVideo.external_url&&<a href={watchVideo.external_url} target="_blank" rel="noreferrer">View original source</a>}</p></section><aside className="video-recommendations"><h3>Up next</h3>{videos.filter(v=>v.id!==watchVideo.id).slice(0,12).map(v=><button className="video-recommendation" key={v.id} onClick={()=>setWatchVideo(v)}><span className="video-recommendation-thumb"><video src={v.video_url} muted playsInline preload="metadata"/></span><span><b>{v.caption||'Community video'}</b><small>@{v.profiles?.username||'Cinder creator'}</small></span></button>)}</aside></main>:<><div className="video-feed-tabs"><button className={feedTab==='for-you'?'selected':''} onClick={showForYou}>For You</button><button className={feedTab==='following'?'selected':''} onClick={showFollowingFeed}>Following</button><button className={feedTab==='saved'?'selected':''} onClick={showSavedFeed}><Bookmark size={14}/> Saved</button></div><div className="video-categories">{['All','Gaming','Music','Education','Comedy','Science','Cooking','Sports'].map(name=><button key={name} className={category===name?'selected':''} onClick={()=>setCategory(name)}>{name}</button>)}</div><main className="video-library-grid">{videos.filter(v=>category==='All'||String(v.caption||'').toLowerCase().includes(category.toLowerCase())).map((v,i)=><article className="video-library-card" key={v.id}><button className="video-library-thumb" onClick={()=>setWatchVideo(v)} aria-label={'Watch '+(v.caption||'video')}><video src={v.video_url} muted playsInline preload={i<8?'metadata':'none'} onMouseEnter={e=>e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0}}/><span><Play size={17}/></span></button><div className="video-library-info"><div className="video-channel-avatar">{(v.profiles?.username||'C').slice(0,1).toUpperCase()}</div><div><button className="video-library-title" onClick={()=>setWatchVideo(v)}>{v.caption||'Community video'}</button><small>@{v.profiles?.username||'Cinder creator'}</small><small>{v.feedSource==='huggingface'?'Public dataset clip':'Cinder community video'}</small><div className="video-social-actions"><button className={saved.includes(v.id)?'liked':''} onClick={()=>toggleSave(v)} disabled={v.feedSource==='huggingface'}><Bookmark size={14} fill={saved.includes(v.id)?'currentColor':'none'}/>{saved.includes(v.id)?'Saved':'Save'}</button><button onClick={()=>openComments(v)} disabled={v.feedSource==='huggingface'}><MessageCircle size={14}/> Comments</button><button onClick={()=>toggleFollow(v)} disabled={!v.user_id||v.feedSource==='huggingface'}><UserPlus size={14}/>{following.includes(v.user_id)?'Following':'Follow'}</button><button onClick={()=>reportVideo(v)} disabled={v.feedSource==='huggingface'}><Flag size={14}/> Report</button></div></div></div></article>)}</main>{!searchActive&&hfHasMoreRef.current&&<button className="video-load-more" onClick={loadMoreHf} disabled={hfLoadingRef.current}>Load more videos</button>}{category!=='All'&&videos.every(v=>!String(v.caption||'').toLowerCase().includes(category.toLowerCase()))&&<div className="video-category-empty">No {category.toLowerCase()} videos in this batch. Choose All or load more videos.</div>}</>}
 </div>

 {commentsFor&&<div className="doom-comments-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCommentsFor(null)}}><section className="doom-comments-panel" role="dialog" aria-modal="true" aria-label="Video comments"><header><div><b>Comments</b><small>{commentsFor.caption||'Cinder video'}</small></div><button onClick={()=>setCommentsFor(null)} aria-label="Close comments"><X size={18}/></button></header><div className="doom-comments-list">{commentsLoading?<div className="doom-comments-empty"><LoaderCircle className="doom-spin"/> Loading comments…</div>:comments.length?comments.map(c=><article className="doom-comment" key={c.id}><div className="doom-comment-avatar">{(c.profile?.username||'C').slice(0,1).toUpperCase()}</div><div className="doom-comment-body"><b>@{c.profile?.username||'Cinder member'}</b><p>{c.body}</p><small>{c.created_at?new Date(c.created_at).toLocaleString():''}</small></div>{c.user_id===user?.id&&<button onClick={()=>deleteComment(c)} aria-label="Delete your comment"><Trash2 size={15}/></button>}</article>):<div className="doom-comments-empty">No comments yet. Start the conversation.</div>}</div><form className="doom-comment-form" onSubmit={addComment}><input value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} maxLength={1000} placeholder={user?'Write a comment…':'Sign in to comment'} disabled={!user||socialBusy}/><button type="submit" disabled={!user||socialBusy||!commentDraft.trim()} aria-label="Post comment">{socialBusy?<LoaderCircle className="doom-spin" size={17}/>:<Send size={17}/>}</button></form></section></div>}
}
