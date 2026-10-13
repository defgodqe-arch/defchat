import React,{useEffect,useRef,useState} from 'react';
import FeatureCenter from './FeatureCenter.jsx';
import {createClient} from '@supabase/supabase-js';
import {Hash,Plus,LogOut,Send,LoaderCircle,ChevronDown,Users,Menu,X,MessageCircle,ArrowLeft,Search,MessageSquare,Camera,ImagePlus,Check,Settings,Headphones,Mic,Inbox,HelpCircle,Compass,ChevronRight,Smile,Trash2,Paperclip,MoreHorizontal,Pencil,UserPlus,Bell,VolumeX,Phone,Video,Upload,CornerUpLeft} from 'lucide-react';

const url=import.meta.env.VITE_SUPABASE_URL||'https://jklhnhnxyzqjvmqgfpjs.supabase.co';
const key=import.meta.env.VITE_SUPABASE_ANON_KEY||'sb_publishable_MMXxKZkJT0H7-oayT60ddA_8nC0kFjn';
const db=createClient(url,key);
const initials=n=>(n||'?').slice(0,2).toUpperCase();
const color=n=>['#eab308','#8b5cf6','#06b6d4','#f97316','#ec4899'][[...(n||'')].reduce((a,c)=>a+c.charCodeAt(0),0)%5];
function Avatar({name,url,className='',zoom=1}){return <div className={'avatar '+className} style={!url?{background:color(name)}:undefined}>{url?<img src={url} style={{transform:'scale('+zoom+')'}} alt={`${name||'User'} avatar`}/>:initials(name)}</div>}
function messageParts(text,items){return (text||'').split(/(:[A-Za-z0-9_]{2,32}:)/g).map((s,i)=>{const n=s.match(/^:([A-Za-z0-9_]{2,32}):$/);const found=n&&items.find(x=>x.name===n[1]);return found?<img key={i} className="inline-custom-emoji" src={found.image_url} alt={found.name}/>:s})}
function Auth({done}) {
  const [savedDraft] = useState(() => {
    try { return JSON.parse(localStorage.getItem('defchat:signup-draft') || '{}'); }
    catch { return {}; }
  });
  const [mode, setMode] = useState(savedDraft.mode || 'signup');
  const [email, setEmail] = useState(savedDraft.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState(savedDraft.username || '');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('defchat:signup-draft', JSON.stringify({ mode, email, username }));
    } catch {}
  }, [mode, email, username]);

  function switchMode(next) {
    setMode(next); setErr(''); setNotice('');
  }

  async function signInWithGoogle() {
    setBusy(true); setErr(''); setNotice('');
    try {
      const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href.split('#')[0] }
      });
      if (error) throw error;
    } catch (e) {
      setErr(e.message || 'Google sign-in could not start.');
      setBusy(false);
    }
  }

  async function resetPassword() {
    setErr(''); setNotice('');
    if (!email.trim()) { setErr('Enter your email address first, then choose Forgot password.'); return; }
    setBusy(true);
    try {
      const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.href.split('#')[0]
      });
      if (error) throw error;
      setNotice('If an account exists for that email, a password reset link is on its way.');
    } catch (e) {
      setErr(e.message || 'Could not send a reset link.');
    } finally { setBusy(false); }
  }

  async function submit(e) {
    e.preventDefault(); setErr(''); setNotice('');
    if (mode === 'signup' && password !== confirmPassword) {
      setErr('Your passwords do not match.'); return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const cleanUsername = username.trim();
        const { data, error } = await db.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: cleanUsername } }
        });
        if (error) throw error;
        if (data.session) {
          try { localStorage.removeItem('defchat:signup-draft'); } catch {}
          done(data.session.user);
        } else {
          setNotice('Email confirmation is still enabled on the server. Your email and username are saved on this device; after confirming, return here and sign in.');
          switchMode('login');
        }
      } else {
        const { data, error } = await db.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        done(data.user);
      }
    } catch (e) {
      const message = e.message || 'Something went wrong. Please try again.';
      setErr(message.toLowerCase().includes('invalid login credentials')
        ? 'That email and password do not match. Check them or reset your password.'
        : message);
    } finally { setBusy(false); }
  }

  return <main className="auth">
    <section className="auth-card">
      <div className="logo">d<span>.</span></div>
      <small>YOUR SPACE. YOUR PEOPLE.</small>
      <h1>{mode === 'signup' ? 'Find your people.' : 'Welcome back.'}</h1>
      <p>Talk about what you love and build your community.</p>
      <div className="tabs">
        <button type="button" className={mode === 'signup' ? 'chosen' : ''} onClick={() => switchMode('signup')}>Create account</button>
        <button type="button" className={mode === 'login' ? 'chosen' : ''} onClick={() => switchMode('login')}>Sign in</button>
      </div>
      <button type="button" className="google-button" onClick={signInWithGoogle} disabled={busy}>
        <svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" transform="translate(0 5)"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.77 7.18l7.73 6C44.41 38.07 46.98 31.94 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56z" transform="translate(0 5)"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" transform="translate(0 -4)"/></svg>
        Continue with Google
      </button>
      <div className="auth-divider"><span>or continue with email</span></div>
      <form onSubmit={submit}>
        {mode === 'signup' && <label>Username
          <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" minLength="2" maxLength="24" pattern="[A-Za-z0-9_.-]+" title="Use letters, numbers, dots, underscores or hyphens" placeholder="yourname" required />
          <span className="field-hint">2–24 characters · letters, numbers, . _ -</span>
        </label>}
        <label>Email address
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required />
        </label>
        <label>Password
          <div className="password-wrap">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength="8" placeholder="At least 8 characters" required />
            <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </label>
        {mode === 'signup' && <label>Confirm password
          <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength="8" placeholder="Enter your password again" required />
        </label>}
        {mode === 'login' && <button type="button" className="forgot-link" onClick={resetPassword} disabled={busy}>Forgot password?</button>}
        {err && <div className="notice error-notice" role="alert">{err}</div>}
        {notice && <div className="notice success-notice" role="status">{notice}</div>}
        <button className="primary auth-submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={16}/>} {mode === 'signup' ? 'Create your account' : 'Sign in to defchat'}</button>
      </form>
      <div className="auth-legal">By continuing, you agree to use defchat respectfully and keep your account secure.</div>
    </section>
  </main>;
}


function ProfileSettings({profile,username,userId,onClose,onSaved}) {
  const [avatar,setAvatar]=useState(null),[banner,setBanner]=useState(null),[avatarZoom,setAvatarZoom]=useState(1),[bannerZoom,setBannerZoom]=useState(1),[bio,setBio]=useState(profile?.bio||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const avatarPreview=avatar?URL.createObjectURL(avatar):profile?.avatar_url;
  const bannerPreview=banner?URL.createObjectURL(banner):profile?.banner_url;
  async function cropImage(file,kind,zoom){
    if(file.type==='image/gif'||zoom===1)return file;
    const imageUrl=URL.createObjectURL(file);
    try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const width=kind==='avatar'?512:1500,height=kind==='avatar'?512:500,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const scale=Math.max(width/img.width,height/img.height)*zoom;const w=img.width*scale,h=img.height*scale;canvas.getContext('2d').drawImage(img,(width-w)/2,(height-h)/2,w,h);canvas.toBlob(blob=>{if(!blob){reject(new Error('Could not crop this image.'));return}resolve(new File([blob],kind+'-cropped.png',{type:'image/png'}))},'image/png')};img.onerror=()=>reject(new Error('Could not read this image.'));img.src=imageUrl})}finally{URL.revokeObjectURL(imageUrl)}
  }
  async function save(){
    if(!avatar&&!banner&&bio===(profile?.bio||'')){setError('Make a change before saving.');return}
    setBusy(true);setError('');setNotice('');
    try{
      const patch={bio:bio.trim().slice(0,190)};
      for(const [kind,original] of [['avatar',avatar],['banner',banner]]){
        if(!original)continue;
        const file=await cropImage(original,kind,kind==='avatar'?avatarZoom:bannerZoom);
        if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw new Error('Use a PNG, JPG, WebP, or GIF image.');
        const max=kind==='avatar'?5:8;
        if(file.size>max*1024*1024)throw new Error(kind==='avatar'?'Avatar must be 5 MB or smaller.':'Banner must be 8 MB or smaller.');
        const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
        const path=userId+'/'+kind+'-'+Date.now()+'.'+ext;
        const {error:uploadError}=await db.storage.from('profile-media').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
        if(uploadError)throw uploadError;
        const {data}=db.storage.from('profile-media').getPublicUrl(path);
        patch[kind==='avatar'?'avatar_url':'banner_url']=data.publicUrl;
      }
      const {data,error:saveError}=await db.from('profiles').update(patch).eq('id',userId).select().single();
      if(saveError)throw saveError;
      onSaved(data);setNotice('Your profile customization is saved!');setAvatar(null);setBanner(null);setAvatarZoom(1);setBannerZoom(1);
    }catch(e){setError(e.message||'Could not save your profile images.')}
    finally{setBusy(false)}
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-settings-title">
      <button className="modal-close" onClick={onClose} aria-label="Close settings"><X size={20}/></button>
      <div className="profile-modal-heading"><span className="settings-icon"><Camera size={20}/></span><div><h2 id="profile-settings-title">Customize your profile</h2><p>Make your defchat profile yours — all for free.</p></div></div>
      <div className="profile-preview">
        <div className="banner-preview">{bannerPreview?<img className="banner-crop-preview" src={bannerPreview} style={{transform:'scale('+bannerZoom+')'}} alt="Banner crop preview"/>:<span><ImagePlus size={20}/> Your profile banner</span>}</div>
        <Avatar name={username} url={avatarPreview} className="preview-avatar" zoom={avatarZoom}/>
        <div className="preview-name">{username}<small>Preview</small></div>
        {avatar&&avatar.type!=='image/gif'&&<label className="crop-control">Avatar zoom <input type="range" min="1" max="2.2" step="0.05" value={avatarZoom} onChange={e=>setAvatarZoom(Number(e.target.value))}/><small>{Math.round(avatarZoom*100)}%</small></label>}
        {banner&&banner.type!=='image/gif'&&<label className="crop-control">Banner zoom <input type="range" min="1" max="2.2" step="0.05" value={bannerZoom} onChange={e=>setBannerZoom(Number(e.target.value))}/><small>{Math.round(bannerZoom*100)}%</small></label>}
      </div>
      <label className="bio-field">About me <textarea value={bio} onChange={e=>setBio(e.target.value.slice(0,190))} maxLength={190} placeholder="A little about yourself…"/><small>{bio.length}/190 characters</small></label>
      <div className="upload-options">
        <label className="upload-choice"><span className="upload-icon"><Camera size={18}/></span><span><b>Profile picture</b><small>GIFs animate · PNG, JPG, WebP, GIF · up to 5 MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setAvatar(e.target.files?.[0]||null)}/><span className="choose-file">{avatar?'Change':'Choose'}</span></label>
        <label className="upload-choice"><span className="upload-icon"><ImagePlus size={18}/></span><span><b>Profile banner</b><small>GIFs animate · PNG, JPG, WebP, GIF · up to 8 MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setBanner(e.target.files?.[0]||null)}/><span className="choose-file">{banner?'Change':'Choose'}</span></label>
      </div>
      {error&&<div className="notice error-notice">{error}</div>}{notice&&<div className="notice success-notice">{notice}</div>}
      <div className="profile-modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary" onClick={save} disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>} Save changes</button></div>
      <p className="free-note">No Nitro, no subscription, no paywall. Animated GIFs are supported.</p>
    </section>
  </div>;
}

export default function App(){
const[user,setUser]=useState(null),[profile,setProfile]=useState(null),[servers,setServers]=useState([]),[server,setServer]=useState(null),[channels,setChannels]=useState([]),[channel,setChannel]=useState(null),[messages,setMessages]=useState([]),[draft,setDraft]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[nav,setNav]=useState(false),[view,setView]=useState('servers'),[dmList,setDmList]=useState([]),[activeDm,setActiveDm]=useState(null),[dmMessages,setDmMessages]=useState([]),[profileOpen,setProfileOpen]=useState(false),[featureOpen,setFeatureOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),[searchQuery,setSearchQuery]=useState(''),[reactions,setReactions]=useState({}),[emojiOpen,setEmojiOpen]=useState(false),[attachment,setAttachment]=useState(null),[editing,setEditing]=useState(null),[editDraft,setEditDraft]=useState(''),[customEmojis,setCustomEmojis]=useState([]),[replyingTo,setReplyingTo]=useState(null),bottom=useRef(null);
useEffect(()=>{const openProfile=()=>setProfileOpen(true);window.addEventListener('defchat:open-profile',openProfile);return()=>window.removeEventListener('defchat:open-profile',openProfile)},[]);
useEffect(()=>{db.auth.getSession().then(({data})=>{setUser(data.session?.user||null);setLoading(false)});const{data:{subscription}}=db.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));return()=>subscription.unsubscribe()},[]);
useEffect(()=>{if(user)load();else{setProfile(null);setServers([]);setChannels([]);setMessages([]);setDmList([]);setActiveDm(null)}},[user?.id]);
async function load(){if(!user)return;const{data:p,error:pe}=await db.from('profiles').select('*').eq('id',user.id).maybeSingle();if(pe)setErr(pe.message);let prof=p;if(!prof){const name=(user.user_metadata?.username||user.email?.split('@')[0]||'member').slice(0,24);const r=await db.from('profiles').upsert({id:user.id,username:name},{onConflict:'id'}).select().maybeSingle();prof=r.data||{username:name};if(r.error)setErr(r.error.message)}setProfile(prof);const{data:m,error}=await db.from('server_members').select('server_id,servers(*)').eq('user_id',user.id);if(error)setErr(error.message);let list=(m||[]).map(x=>x.servers).filter(Boolean);if(!list.length){const{data:id,error:e}=await db.rpc('create_server_with_defaults',{server_name:'The Lounge'});if(!e&&id){const{data:m2}=await db.from('server_members').select('server_id,servers(*)').eq('user_id',user.id);list=(m2||[]).map(x=>x.servers).filter(Boolean)}else if(e)setErr(e.message)}setServers(list);if(list.length)setServer(prev=>list.find(s=>s.id===prev?.id)||list[0]);await loadDMList();}
async function loadDMList(){if(!user)return;const{data:mine,error}=await db.from('dm_members').select('conversation_id').eq('user_id',user.id);if(error){setErr(error.message);return}const ids=[...new Set((mine||[]).map(x=>x.conversation_id))];const out=[];for(const id of ids){const[{data:members},{data:conv}]=await Promise.all([db.from('dm_members').select('user_id').eq('conversation_id',id),db.from('dm_conversations').select('id,name,is_group').eq('id',id).maybeSingle()]);if(conv?.is_group||(members||[]).length>2){const{data:people}=await db.from('profiles').select('id,username,avatar_url').in('id',(members||[]).map(x=>x.user_id));out.push({id,is_group:true,username:conv?.name||'Group conversation',members:people||[]});continue}const other=(members||[]).find(x=>x.user_id!==user.id);if(!other)continue;const{data:p}=await db.from('profiles').select('id,username,avatar_url,banner_url,bio,status').eq('id',other.user_id).maybeSingle();if(p)out.push({id,user_id:other.user_id,username:p.username,avatar_url:p.avatar_url,banner_url:p.banner_url,bio:p.bio,status:p.status})}setDmList(prev=>out.map(item=>({...item,unreadCount:prev.find(p=>p.id===item.id)?.unreadCount||0})));setActiveDm(prev=>out.find(x=>x.id===prev?.id)||prev||null)}
useEffect(()=>{if(!server||view!=='servers')return;(async()=>{const{data,error}=await db.from('channels').select('*').eq('server_id',server.id).order('created_at');if(error)setErr(error.message);setChannels(data||[]);setChannel(prev=>(data||[]).find(c=>c.id===prev?.id)||data?.[0]||null)})()},[server?.id,view]);
useEffect(()=>{if(!channel||!user||view!=='servers')return;let live=true;(async()=>{const{data,error}=await db.from('messages').select('id,content,created_at,user_id,edited_at,attachment_url,attachment_name,attachment_type,reply_to').eq('channel_id',channel.id).order('created_at').limit(100);if(!live)return;if(error){setErr(error.message);return}const ids=[...new Set((data||[]).map(m=>m.user_id))];const{data:people}=await db.from('profiles').select('id,username,avatar_url').in('id',ids.length?ids:[user.id]);const map=Object.fromEntries((people||[]).map(p=>[p.id,p]));setMessages((data||[]).map(m=>({...m,profiles:map[m.user_id]||{username:'member'}})))})();const sub=db.channel('chat-'+channel.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'channel_id=eq.'+channel.id},async payload=>{const{data:p}=await db.from('profiles').select('username,avatar_url').eq('id',payload.new.user_id).maybeSingle();if(live)setMessages(prev=>prev.some(m=>m.id===payload.new.id)?prev:[...prev,{...payload.new,profiles:p||{username:'member'}}])}).subscribe();return()=>{live=false;db.removeChannel(sub)}},[channel?.id,user?.id,view]);
useEffect(()=>{if(view==='servers'&&server){loadCustomEmojis()}},[server?.id,view]);
useEffect(()=>{if(!user)return;const sub=db.channel('dm-unread-'+user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'dm_messages'},payload=>{if(payload.new.user_id!==user.id&&payload.new.conversation_id!==activeDm?.id){setDmList(prev=>prev.map(d=>d.id===payload.new.conversation_id?{...d,unreadCount:(d.unreadCount||0)+1}:d))}}).subscribe();return()=>{db.removeChannel(sub)}},[user?.id,activeDm?.id]);
useEffect(()=>{if(!activeDm||!user||view!=='dms')return;let live=true;(async()=>{const{data,error}=await db.from('dm_messages').select('id,content,created_at,user_id,edited_at,attachment_url,attachment_name,attachment_type,reply_to').eq('conversation_id',activeDm.id).order('created_at').limit(100);if(error){setErr(error.message);return}const ids=[...new Set((data||[]).map(m=>m.user_id))];const{data:people}=await db.from('profiles').select('id,username').in('id',ids.length?ids:[user.id]);const map=Object.fromEntries((people||[]).map(p=>[p.id,p]));if(live)setDmMessages((data||[]).map(m=>({...m,profiles:map[m.user_id]||{username:'member'}})))})();const sub=db.channel('dm-'+activeDm.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'dm_messages',filter:'conversation_id=eq.'+activeDm.id},async payload=>{const{data:p}=await db.from('profiles').select('username').eq('id',payload.new.user_id).maybeSingle();if(live)setDmMessages(prev=>prev.some(m=>m.id===payload.new.id)?prev:[...prev,{...payload.new,profiles:p||{username:'member'}}])}).subscribe();return()=>{live=false;db.removeChannel(sub)}},[activeDm?.id,user?.id,view]);
useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})},[messages,dmMessages]);
useEffect(()=>{const ids=messages.map(m=>m.id);if(view!=='servers'||!ids.length){setReactions({});return}let live=true;db.from('message_reactions').select('message_id,user_id,emoji').in('message_id',ids).then(({data,error})=>{if(!live)return;if(!error){const grouped={};for(const r of data||[])(grouped[r.message_id]??=[]).push(r);setReactions(grouped)}});return()=>{live=false}},[messages,view]);
async function toggleReaction(message,emoji){if(view!=='servers')return;const current=(reactions[message.id]||[]).some(r=>r.user_id===user.id&&r.emoji===emoji);const result=current?await db.from('message_reactions').delete().eq('message_id',message.id).eq('user_id',user.id).eq('emoji',emoji):await db.from('message_reactions').insert({message_id:message.id,user_id:user.id,emoji});if(result.error){setErr(result.error.message);return}setReactions(prev=>{const list=prev[message.id]||[];return {...prev,[message.id]:current?list.filter(r=>!(r.user_id===user.id&&r.emoji===emoji)):[...list,{message_id:message.id,user_id:user.id,emoji}]}})}
async function deleteMessage(message){if(message.user_id!==user.id)return;if(!window.confirm('Delete this message?'))return;const table=view==='dms'?'dm_messages':'messages';const{error}=await db.from(table).delete().eq('id',message.id).eq('user_id',user.id);if(error){setErr(error.message);return}if(view==='dms')setDmMessages(prev=>prev.filter(m=>m.id!==message.id));else setMessages(prev=>prev.filter(m=>m.id!==message.id))}
async function send(e){e.preventDefault();const content=draft.trim();if((!content&&!attachment)||busy)return;setBusy(true);try{let media={};if(attachment){if(!attachment.type.startsWith('image/'))throw new Error('Please choose an image file.');if(attachment.size>12*1024*1024)throw new Error('Images must be 12 MB or smaller.');const ext=attachment.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'')||'png';const path=user.id+'/chat-'+Date.now()+'.'+ext;const{error:uploadError}=await db.storage.from('chat-media').upload(path,attachment,{contentType:attachment.type,upsert:false});if(uploadError)throw uploadError;media={attachment_url:db.storage.from('chat-media').getPublicUrl(path).data.publicUrl,attachment_name:attachment.name,attachment_type:attachment.type}}const table=view==='dms'&&activeDm?'dm_messages':'messages';const payload=view==='dms'&&activeDm?{conversation_id:activeDm.id,user_id:user.id,content:content||' ',reply_to:replyingTo?.id||null,...media}:{channel_id:channel?.id,user_id:user.id,content:content||' ',reply_to:replyingTo?.id||null,...media};const result=await db.from(table).insert(payload);if(result.error)throw result.error;setDraft('');setAttachment(null);setReplyingTo(null);setEmojiOpen(false)}catch(e){setErr(e.message||'Message could not be sent')}finally{setBusy(false)}}
async function editMessage(message){const content=editDraft.trim();if(!content){setErr('Message cannot be empty.');return}const table=view==='dms'?'dm_messages':'messages';const{data,error}=await db.from(table).update({content,edited_at:new Date().toISOString()}).eq('id',message.id).eq('user_id',user.id).select().single();if(error){setErr(error.message);return}const setter=view==='dms'?setDmMessages:setMessages;setter(prev=>prev.map(m=>m.id===message.id?{...m,...data}:m));setEditing(null);setEditDraft('')}
async function loadCustomEmojis(){if(!server)return;const{data,error}=await db.from('custom_emojis').select('id,name,image_url').eq('server_id',server.id).order('name');if(error)setErr(error.message);else setCustomEmojis(data||[])}
async function uploadEmoji(file){if(!file||!server)return;if(!file.type.startsWith('image/')||file.size>8*1024*1024){setErr('Choose an image or GIF under 8 MB.');return}const raw=window.prompt('Name this emoji (letters, numbers, underscores):');if(!raw)return;const name=raw.toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,32);if(name.length<2){setErr('Emoji names need at least 2 characters.');return}const path=user.id+'/emoji-'+Date.now()+'.'+(file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'')||'gif');const{error:up}=await db.storage.from('chat-media').upload(path,file,{contentType:file.type});if(up){setErr(up.message);return}const image_url=db.storage.from('chat-media').getPublicUrl(path).data.publicUrl;const{error}=await db.from('custom_emojis').insert({server_id:server.id,name,image_url,uploaded_by:user.id});if(error){setErr(error.message);return}await loadCustomEmojis()}
async function createInvite(){if(!server)return;const{data,error}=await db.from('server_invites').insert({server_id:server.id,created_by:user.id}).select('code').single();if(error){setErr(error.message);return}try{await navigator.clipboard.writeText(window.location.origin+'/invite/'+data.code);setErr('Invite link copied: '+window.location.origin+'/invite/'+data.code)}catch{setErr('Invite code: '+data.code)}}
async function addServer(){const name=window.prompt('Name your community:');if(!name?.trim())return;const{data:id,error}=await db.rpc('create_server_with_defaults',{server_name:name.trim().slice(0,60)});if(error){setErr(error.message);return}await load();const{data:m}=await db.from('server_members').select('server_id,servers(*)').eq('user_id',user.id);setServer((m||[]).map(x=>x.servers).find(s=>s?.id===id)||server)}
async function addChannel(){if(!server)return;const raw=window.prompt('Channel name:');if(!raw?.trim())return;const name=raw.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,40);const{data,error}=await db.from('channels').insert({server_id:server.id,name,type:'text'}).select().single();if(error)setErr(error.message);else{setChannels(a=>[...a,data]);setChannel(data)}}
async function openPersonDM(person){setFeatureOpen(false);if(!person){setView('dms');setNav(false);return}if(person.is_group&&person.id){const item={...person};setDmList(prev=>prev.some(x=>x.id===item.id)?prev:[item,...prev]);setActiveDm(item);setDmList(prev=>prev.map(d=>d.id===item.id?{...d,unreadCount:0}:d));setView('dms');setNav(false);return}const personId=person.id||person.user_id;if(!personId||personId===user.id)return;const existing=dmList.find(d=>d.user_id===personId);if(existing){setActiveDm(existing);setDmList(prev=>prev.map(d=>d.id===existing.id?{...d,unreadCount:0}:d));setView('dms');setNav(false);return}const{data:conv,error:ce}=await db.from('dm_conversations').insert({}).select('id').single();if(ce){setErr(ce.message);return}const{error:me}=await db.from('dm_members').insert([{conversation_id:conv.id,user_id:user.id},{conversation_id:conv.id,user_id:personId}]);if(me){setErr(me.message);return}const item={id:conv.id,user_id:personId,username:person.username,avatar_url:person.avatar_url,banner_url:person.banner_url,bio:person.bio,status:person.status};setDmList(prev=>[item,...prev]);setActiveDm(item);setView('dms');setNav(false)}
async function startDM(){const raw=window.prompt('Enter the exact username of the person you want to message:');if(!raw?.trim())return;const{data:person,error}=await db.from('profiles').select('id,username,avatar_url,banner_url,bio,status').ilike('username',raw.trim()).maybeSingle();if(error){setErr(error.message);return}if(!person){setErr('No user found with that username.');return}if(person.id===user.id){setErr('You cannot start a DM with yourself.');return}const existing=dmList.find(d=>d.user_id===person.id);if(existing){setActiveDm(existing);setView('dms');setNav(false);return}const{data:conv,error:ce}=await db.from('dm_conversations').insert({}).select('id').single();if(ce){setErr(ce.message);return}const{error:me}=await db.from('dm_members').insert({conversation_id:conv.id,user_id:user.id});if(me){setErr(me.message);return}const{error:them}=await db.from('dm_members').insert({conversation_id:conv.id,user_id:person.id});if(them){setErr(them.message);return}const item={id:conv.id,user_id:person.id,username:person.username,avatar_url:person.avatar_url,banner_url:person.banner_url,bio:person.bio,status:person.status};setDmList(prev=>[item,...prev]);setActiveDm(item);setView('dms');setNav(false)}
if(loading)return <div className="loading"><div className="logo">d<span>.</span></div><LoaderCircle className="spin"/></div>;if(!user)return <Auth done={setUser}/>;const username=profile?.username||user.email?.split('@')[0]||'member';const allShownMessages=view==='dms'?dmMessages:messages;const shownMessages=searchQuery.trim()?allShownMessages.filter(m=>(m.content||'').toLowerCase().includes(searchQuery.trim().toLowerCase())||(m.profiles?.username||'').toLowerCase().includes(searchQuery.trim().toLowerCase())):allShownMessages;const title=view==='dms'?(activeDm?activeDm.username:'Direct messages'):(channel?.name||'welcome');
return <div className="app"><aside className="rail"><div className="logo mini">d<span>.</span></div><div className="line"/><button className={'rail-action '+(view==='servers'?'rail-active':'')} title="Communities" onClick={()=>{setView('servers');setNav(false)}}><Hash/></button>{servers.map(s=><button key={s.id} className={'server '+(s.id===server?.id&&view==='servers'?'selected':'')} style={{background:color(s.name)}} title={s.name} onClick={()=>{setServer(s);setView('servers');setNav(false)}}>{initials(s.name)}</button>)}<button className="add" onClick={addServer} title="Create community"><Plus/></button><div className="line"/><button className={'rail-action '+(view==='dms'?'rail-active':'')} title="Direct messages" onClick={()=>{setView('dms');setNav(false)}}><MessageCircle/></button><button className="add" onClick={startDM} title="Start a direct message"><Plus/></button></aside><aside className={'sidebar '+(nav?'nav-open':'')}>{view==='servers'?<><button className="server-title" onClick={()=>setFeatureOpen(true)} title="Community settings"><span>{server?.name||'Communities'}</span><Settings size={16}/></button><div className="channel-list"><div className="section"><span>TEXT CHANNELS</span><button onClick={addChannel} title="Create channel"><Plus size={16}/></button></div>{channels.map(c=><button key={c.id} className={'channel '+(channel?.id===c.id?'active':'')} onClick={()=>{setChannel(c);setNav(false)}}><Hash size={17}/>{c.name}</button>)}</div></>:<><div className="server-title dm-title"><span>Direct Messages</span><button className="icon-button" onClick={startDM} title="New message"><Plus size={18}/></button></div><div className="channel-list"><div className="section">YOUR CONVERSATIONS <button onClick={()=>setFeatureOpen(true)} title="Create group DM"><Users size={15}/></button></div>{dmList.map(d=><button key={d.id} className={'channel '+(activeDm?.id===d.id?'active':'')} onClick={()=>{setActiveDm(d);setDmList(prev=>prev.map(x=>x.id===d.id?{...x,unreadCount:0}:x));setNav(false)}}><Avatar name={d.username} url={d.avatar_url}/><span>{d.username}</span>{d.is_group&&<Users size={13}/>}{d.unreadCount>0&&<i className="unread-badge">{d.unreadCount>99?'99+':d.unreadCount}</i>}</button>)}{!dmList.length&&<p className="empty-dms">No DMs yet. Use + to message someone by username.</p>}</div></>}<div className="user-row"><button className="profile-open" title="Customize your profile" onClick={()=>setProfileOpen(true)}><span className="presence-avatar"><Avatar name={username} url={profile?.avatar_url}/><i/></span><span className="user-label"><b>{username}</b><small>{profile?.status||'online'}</small></span></button><button className="voice-control" title="Voice & video" onClick={()=>setFeatureOpen(true)}><Mic size={17}/></button><button className="voice-control" title="Notifications and sound" onClick={()=>setFeatureOpen(true)}><Headphones size={17}/></button><button className="voice-control" title="Settings" onClick={()=>setFeatureOpen(true)}><Settings size={17}/></button></div></aside><main className="chat"><header><button className="mobile" onClick={()=>setNav(!nav)}>{nav?<X/>:<Menu/>}</button>{view==='dms'?<MessageSquare size={21}/>:<Hash size={21}/>}<b>{title}</b><span className="header-divider"/><span className="live"><i/> Live</span><span className="spacer"/><button className="header-action" title="Search messages" onClick={()=>{setSearchOpen(v=>!v);setSearchQuery('')}}><Search size={19}/></button><button className="header-action" title="Friends, groups and settings" onClick={()=>setFeatureOpen(true)}><Users size={19}/></button><button className="header-action" title="Inbox and notifications" onClick={()=>setFeatureOpen(true)}><Inbox size={19}/></button><button className="header-action" title="Voice and video" onClick={()=>setFeatureOpen(true)}><Phone size={19}/></button></header>{err&&<div className="error">{err}<button onClick={()=>setErr('')}>×</button></div>}{searchOpen&&<div className="message-search"><Search size={16}/><input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search messages or usernames…"/><span>{searchQuery?shownMessages.length+' results':''}</span><button onClick={()=>{setSearchOpen(false);setSearchQuery('')}} aria-label="Close search"><X size={16}/></button></div>}<section className="messages">{view==='servers'&&!channel?<div className="welcome"><div><Hash size={28}/></div><h2>Choose a channel</h2><p>Select a text channel to start chatting.</p></div>:view==='dms'&&!activeDm?<div className="welcome"><div><MessageCircle size={28}/></div><h2>Your direct messages</h2><p>Start a private conversation using the + button.</p><button className="primary inline-primary" onClick={startDM}>New message</button></div>:<>{view==='servers'&&<div className="welcome"><div><Hash size={28}/></div><h2>Welcome to #{channel?.name||'welcome'}!</h2><p>This is the beginning of the channel. Say hello 👋</p></div>}{view==='dms'&&<div className="welcome dm-welcome"><div className="dm-profile-banner" style={activeDm?.banner_url?{backgroundImage:'url("'+activeDm.banner_url+'")'}:undefined}></div><div><Avatar name={activeDm?.username} url={activeDm?.avatar_url}/></div><h2>{activeDm?.username}</h2><p>{activeDm?.bio||'This is the beginning of your direct message history.'}</p></div>}{shownMessages.map(m=><article className="message" key={m.id}><Avatar name={m.profiles?.username} url={m.profiles?.avatar_url}/><div className="message-body"><div className="meta"><b>{m.profiles?.username||'member'}</b><time>{new Date(m.created_at).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time><span className="message-tools"><button title="Reply to message" onClick={()=>setReplyingTo(m)}><CornerUpLeft size={14}/></button>{view==='servers'&&<button title="Add a reaction" onClick={()=>toggleReaction(m,'👍')}><Smile size={14}/></button>}{m.user_id===user.id&&<button title="Edit message" onClick={()=>{setEditing(m.id);setEditDraft(m.content)}}><Pencil size={14}/></button>}{m.user_id===user.id&&<button title="Delete message" onClick={()=>deleteMessage(m)}><Trash2 size={14}/></button>}</span></div>{m.reply_to&&<div className="reply-reference"><CornerUpLeft size={12}/><span>{allShownMessages.find(x=>x.id===m.reply_to)?.profiles?.username||'Previous message'}</span><small>{allShownMessages.find(x=>x.id===m.reply_to)?.content||'Message unavailable'}</small></div>}<div className="message-content">{editing===m.id?<form className="edit-message-form" onSubmit={e=>{e.preventDefault();editMessage(m)}}><input value={editDraft} onChange={e=>setEditDraft(e.target.value)} autoFocus maxLength={4000}/><button className="primary">Save</button><button type="button" className="secondary-button" onClick={()=>setEditing(null)}>Cancel</button></form>:<>{messageParts(m.content,customEmojis)}{m.edited_at&&<small className="edited-tag"> (edited)</small>}</>}{m.attachment_url&&<a className="message-attachment" href={m.attachment_url} target="_blank" rel="noreferrer"><img src={m.attachment_url} alt={m.attachment_name||'Chat attachment'}/></a>}</div>{view==='servers'&&<div className="reactions">{['👍','❤️','😂','🎉','👀'].map(emoji=>{const list=reactions[m.id]||[];const count=list.filter(r=>r.emoji===emoji).length;const mine=list.some(r=>r.emoji===emoji&&r.user_id===user.id);return <button key={emoji} className={mine?'reaction mine':'reaction'} onClick={()=>toggleReaction(m,emoji)} title={mine?'Remove your reaction':'React with '+emoji}>{emoji}{count>0&&<span>{count}</span>}</button>})}</div>}</div></article>)}{searchQuery&&shownMessages.length===0&&<div className="search-empty">No messages match “{searchQuery}”.</div>}<div ref={bottom}/></>}</section>{emojiOpen&&<div className="emoji-picker"><div className="emoji-picker-head"><b>Emoji</b><label className="upload-emoji"><Upload size={15}/> Upload GIF/emoji<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>uploadEmoji(e.target.files?.[0])}/></label></div><div className="emoji-grid">{'😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😍 🥰 😎 🤔 😭 😡 👍 👎 👏 🙌 ❤️ 💛 💚 💙 💜 💯 🔥 🎉 👀 🚀 ✨ 💀'.split(' ').map(emoji=><button type="button" key={emoji} onClick={()=>setDraft(v=>v+emoji)}>{emoji}</button>)}</div>{customEmojis.length>0&&<><div className="emoji-picker-head"><b>Community emoji</b></div><div className="emoji-grid">{customEmojis.map(e=><button type="button" title={':'+e.name+':'} key={e.id} onClick={()=>setDraft(v=>v+':'+e.name+':')}><img src={e.image_url} alt={e.name}/></button>)}</div></>}</div>}{replyingTo&&<div className="reply-composer"><CornerUpLeft size={14}/><span>Replying to <b>{replyingTo.profiles?.username||'member'}</b>: {(replyingTo.content||'Image attachment').slice(0,100)}</span><button type="button" onClick={()=>setReplyingTo(null)}><X size={15}/></button></div>}<form className="composer" onSubmit={send}><button type="button" className="composer-extra" title="Attach image" onClick={()=>document.getElementById('chat-attachment')?.click()}><Paperclip size={18}/></button><input id="chat-attachment" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e=>setAttachment(e.target.files?.[0]||null)}/><button type="button" className="composer-extra" title="Emoji" onClick={()=>{setEmojiOpen(v=>!v);if(!emojiOpen&&view==='servers')loadCustomEmojis()}}><Smile size={18}/></button><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={view==='dms'?'Message '+(activeDm?.username||''):'Message #'+(channel?.name||'welcome')} maxLength={4000} disabled={view==='dms'?!activeDm:!channel}/>{attachment&&<span className="attachment-pending">{attachment.name}<button type="button" onClick={()=>setAttachment(null)}>×</button></span>}<button disabled={(!draft.trim()&&!attachment)||busy||(view==='dms'?!activeDm:!channel)}>{busy?<LoaderCircle className="spin" size={18}/>:<Send size={18}/>}</button></form><footer>Made for your community on <b>defgodqe</b></footer></main>{profileOpen&&<ProfileSettings profile={profile} username={username} userId={user.id} onClose={()=>setProfileOpen(false)} onSaved={setProfile}/>}{featureOpen&&<FeatureCenter db={db} user={user} profile={profile} server={server} onClose={()=>setFeatureOpen(false)} onProfileSaved={setProfile} onOpenDM={openPersonDM} onRefreshServer={async()=>{const{data}=await db.from('channels').select('*').eq('server_id',server?.id).order('created_at');setChannels(data||[])}} onJoinedServer={()=>window.location.reload()}/>}</div>}
