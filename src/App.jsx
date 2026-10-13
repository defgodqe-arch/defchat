import React,{useEffect,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Hash,Plus,LogOut,Send,LoaderCircle,ChevronDown,Users,Menu,X,MessageCircle,ArrowLeft,Search,MessageSquare} from 'lucide-react';

const url=import.meta.env.VITE_SUPABASE_URL||'https://jklhnhnxyzqjvmqgfpjs.supabase.co';
const key=import.meta.env.VITE_SUPABASE_ANON_KEY||'sb_publishable_MMXxKZkJT0H7-oayT60ddA_8nC0kFjn';
const db=createClient(url,key);
const initials=n=>(n||'?').slice(0,2).toUpperCase();
const color=n=>['#eab308','#8b5cf6','#06b6d4','#f97316','#ec4899'][[...(n||'')].reduce((a,c)=>a+c.charCodeAt(0),0)%5];
function Avatar({name}){return <div className="avatar" style={{background:color(name)}}>{initials(name)}</div>}
function Auth({done}) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

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
        if (data.session) done(data.session.user);
        else setNotice('Your account is almost ready! Check your email for a confirmation link, then come back to sign in.');
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

export default function App(){
const[user,setUser]=useState(null),[profile,setProfile]=useState(null),[servers,setServers]=useState([]),[server,setServer]=useState(null),[channels,setChannels]=useState([]),[channel,setChannel]=useState(null),[messages,setMessages]=useState([]),[draft,setDraft]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[nav,setNav]=useState(false),[view,setView]=useState('servers'),[dmList,setDmList]=useState([]),[activeDm,setActiveDm]=useState(null),[dmMessages,setDmMessages]=useState([]),bottom=useRef(null);
useEffect(()=>{db.auth.getSession().then(({data})=>{setUser(data.session?.user||null);setLoading(false)});const{data:{subscription}}=db.auth.onAuthStateChange((_e,s)=>setUser(s?.user||null));return()=>subscription.unsubscribe()},[]);
useEffect(()=>{if(user)load();else{setProfile(null);setServers([]);setChannels([]);setMessages([]);setDmList([]);setActiveDm(null)}},[user?.id]);
async function load(){if(!user)return;const{data:p,error:pe}=await db.from('profiles').select('*').eq('id',user.id).maybeSingle();if(pe)setErr(pe.message);let prof=p;if(!prof){const name=(user.user_metadata?.username||user.email?.split('@')[0]||'member').slice(0,24);const r=await db.from('profiles').upsert({id:user.id,username:name},{onConflict:'id'}).select().maybeSingle();prof=r.data||{username:name};if(r.error)setErr(r.error.message)}setProfile(prof);const{data:m,error}=await db.from('server_members').select('server_id,servers(*)').eq('user_id',user.id);if(error)setErr(error.message);let list=(m||[]).map(x=>x.servers).filter(Boolean);if(!list.length){const{data:id,error:e}=await db.rpc('create_server_with_defaults',{server_name:'The Lounge'});if(!e&&id){const{data:m2}=await db.from('server_members').select('server_id,servers(*)').eq('user_id',user.id);list=(m2||[]).map(x=>x.servers).filter(Boolean)}else if(e)setErr(e.message)}setServers(list);if(list.length)setServer(prev=>list.find(s=>s.id===prev?.id)||list[0]);await loadDMList();}
async function loadDMList(){if(!user)return;const{data:mine,error}=await db.from('dm_members').select('conversation_id').eq('user_id',user.id);if(error){setErr(error.message);return}const ids=[...new Set((mine||[]).map(x=>x.conversation_id))];const out=[];for(const id of ids){const{data:members}=await db.from('dm_members').select('user_id').eq('conversation_id',id);const other=(members||[]).find(x=>x.user_id!==user.id);if(!other)continue;const{data:p}=await db.from('profiles').select('id,username,avatar_url').eq('id',other.user_id).maybeSingle();if(p)out.push({id,user_id:other.user_id,username:p.username,avatar_url:p.avatar_url})}setDmList(out);setActiveDm(prev=>out.find(x=>x.id===prev?.id)||prev||null)}
useEffect(()=>{if(!server||view!=='servers')return;(async()=>{const{data,error}=await db.from('channels').select('*').eq('server_id',server.id).order('created_at');if(error)setErr(error.message);setChannels(data||[]);setChannel(prev=>(data||[]).find(c=>c.id===prev?.id)||data?.[0]||null)})()},[server?.id,view]);
useEffect(()=>{if(!channel||!user||view!=='servers')return;let live=true;(async()=>{const{data,error}=await db.from('messages').select('id,content,created_at,user_id').eq('channel_id',channel.id).order('created_at').limit(100);if(!live)return;if(error){setErr(error.message);return}const ids=[...new Set((data||[]).map(m=>m.user_id))];const{data:people}=await db.from('profiles').select('id,username').in('id',ids.length?ids:[user.id]);const map=Object.fromEntries((people||[]).map(p=>[p.id,p.username]));setMessages((data||[]).map(m=>({...m,profiles:{username:map[m.user_id]||'member'}})))})();const sub=db.channel('chat-'+channel.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'channel_id=eq.'+channel.id},async payload=>{const{data:p}=await db.from('profiles').select('username').eq('id',payload.new.user_id).maybeSingle();if(live)setMessages(prev=>prev.some(m=>m.id===payload.new.id)?prev:[...prev,{...payload.new,profiles:p||{username:'member'}}])}).subscribe();return()=>{live=false;db.removeChannel(sub)}},[channel?.id,user?.id,view]);
useEffect(()=>{if(!activeDm||!user||view!=='dms')return;let live=true;(async()=>{const{data,error}=await db.from('dm_messages').select('id,content,created_at,user_id').eq('conversation_id',activeDm.id).order('created_at').limit(100);if(error){setErr(error.message);return}const ids=[...new Set((data||[]).map(m=>m.user_id))];const{data:people}=await db.from('profiles').select('id,username').in('id',ids.length?ids:[user.id]);const map=Object.fromEntries((people||[]).map(p=>[p.id,p.username]));if(live)setDmMessages((data||[]).map(m=>({...m,profiles:{username:map[m.user_id]||'member'}})))})();const sub=db.channel('dm-'+activeDm.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'dm_messages',filter:'conversation_id=eq.'+activeDm.id},async payload=>{const{data:p}=await db.from('profiles').select('username').eq('id',payload.new.user_id).maybeSingle();if(live)setDmMessages(prev=>prev.some(m=>m.id===payload.new.id)?prev:[...prev,{...payload.new,profiles:p||{username:'member'}}])}).subscribe();return()=>{live=false;db.removeChannel(sub)}},[activeDm?.id,user?.id,view]);
useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})},[messages,dmMessages]);
async function send(e){e.preventDefault();const content=draft.trim();if(!content||busy)return;setBusy(true);try{const result=view==='dms'&&activeDm?await db.from('dm_messages').insert({conversation_id:activeDm.id,user_id:user.id,content}):await db.from('messages').insert({channel_id:channel?.id,user_id:user.id,content});if(result.error)throw result.error;setDraft('')}catch(e){setErr(e.message||'Message could not be sent')}finally{setBusy(false)}}
async function addServer(){const name=window.prompt('Name your community:');if(!name?.trim())return;const{data:id,error}=await db.rpc('create_server_with_defaults',{server_name:name.trim().slice(0,60)});if(error){setErr(error.message);return}await load();const{data:m}=await db.from('server_members').select('server_id,servers(*)').eq('user_id',user.id);setServer((m||[]).map(x=>x.servers).find(s=>s?.id===id)||server)}
async function addChannel(){if(!server)return;const raw=window.prompt('Channel name:');if(!raw?.trim())return;const name=raw.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,40);const{data,error}=await db.from('channels').insert({server_id:server.id,name,type:'text'}).select().single();if(error)setErr(error.message);else{setChannels(a=>[...a,data]);setChannel(data)}}
async function startDM(){const raw=window.prompt('Enter the exact username of the person you want to message:');if(!raw?.trim())return;const{data:person,error}=await db.from('profiles').select('id,username,avatar_url').ilike('username',raw.trim()).maybeSingle();if(error){setErr(error.message);return}if(!person){setErr('No user found with that username.');return}if(person.id===user.id){setErr('You cannot start a DM with yourself.');return}const existing=dmList.find(d=>d.user_id===person.id);if(existing){setActiveDm(existing);setView('dms');setNav(false);return}const{data:conv,error:ce}=await db.from('dm_conversations').insert({}).select('id').single();if(ce){setErr(ce.message);return}const{error:me}=await db.from('dm_members').insert({conversation_id:conv.id,user_id:user.id});if(me){setErr(me.message);return}const{error:them}=await db.from('dm_members').insert({conversation_id:conv.id,user_id:person.id});if(them){setErr(them.message);return}const item={id:conv.id,user_id:person.id,username:person.username,avatar_url:person.avatar_url};setDmList(prev=>[item,...prev]);setActiveDm(item);setView('dms');setNav(false)}
if(loading)return <div className="loading"><div className="logo">d<span>.</span></div><LoaderCircle className="spin"/></div>;if(!user)return <Auth done={setUser}/>;const username=profile?.username||user.email?.split('@')[0]||'member';const shownMessages=view==='dms'?dmMessages:messages;const title=view==='dms'?(activeDm?activeDm.username:'Direct messages'):(channel?.name||'welcome');
return <div className="app"><aside className="rail"><div className="logo mini">d<span>.</span></div><div className="line"/><button className={'rail-action '+(view==='servers'?'rail-active':'')} title="Communities" onClick={()=>{setView('servers');setNav(false)}}><Hash/></button>{servers.map(s=><button key={s.id} className={'server '+(s.id===server?.id&&view==='servers'?'selected':'')} style={{background:color(s.name)}} title={s.name} onClick={()=>{setServer(s);setView('servers');setNav(false)}}>{initials(s.name)}</button>)}<button className="add" onClick={addServer} title="Create community"><Plus/></button><div className="line"/><button className={'rail-action '+(view==='dms'?'rail-active':'')} title="Direct messages" onClick={()=>{setView('dms');setNav(false)}}><MessageCircle/></button><button className="add" onClick={startDM} title="Start a direct message"><Plus/></button></aside><aside className={'sidebar '+(nav?'nav-open':'')}>{view==='servers'?<><button className="server-title">{server?.name||'Communities'} <ChevronDown size={16}/></button><div className="channel-list"><div className="section">TEXT CHANNELS <button onClick={addChannel}><Plus size={16}/></button></div>{channels.map(c=><button key={c.id} className={'channel '+(channel?.id===c.id?'active':'')} onClick={()=>{setChannel(c);setNav(false)}}><Hash size={17}/>{c.name}</button>)}</div></>:<><button className="server-title">Direct messages <button className="icon-button" onClick={startDM} title="New message"><Plus size={18}/></button></button><div className="channel-list"><div className="section">YOUR CONVERSATIONS</div>{dmList.map(d=><button key={d.id} className={'channel '+(activeDm?.id===d.id?'active':'')} onClick={()=>{setActiveDm(d);setNav(false)}}><Avatar name={d.username}/><span>{d.username}</span></button>)}{!dmList.length&&<p className="empty-dms">No DMs yet. Use + to message someone by username.</p>}</div></>}<div className="user-row"><Avatar name={username}/><div className="user-label"><b>{username}</b><small>Online</small></div><button title="Sign out" onClick={()=>db.auth.signOut()}><LogOut size={17}/></button></div></aside><main className="chat"><header><button className="mobile" onClick={()=>setNav(!nav)}>{nav?<X/>:<Menu/>}</button>{view==='dms'?<MessageSquare size={19}/>:<Hash/>}<b>{title}</b><span className="spacer"/><span className="live">● Live chat</span><Users size={19}/></header>{err&&<div className="error">{err}<button onClick={()=>setErr('')}>×</button></div>}<section className="messages">{view==='servers'&&!channel?<div className="welcome"><div><Hash size={28}/></div><h2>Choose a channel</h2><p>Select a text channel to start chatting.</p></div>:view==='dms'&&!activeDm?<div className="welcome"><div><MessageCircle size={28}/></div><h2>Your direct messages</h2><p>Start a private conversation using the + button.</p><button className="primary inline-primary" onClick={startDM}>New message</button></div>:<>{view==='servers'&&<div className="welcome"><div><Hash size={28}/></div><h2>Welcome to #{channel?.name||'welcome'}!</h2><p>This is the beginning of the channel. Say hello 👋</p></div>}{view==='dms'&&<div className="welcome dm-welcome"><div><Avatar name={activeDm?.username}/></div><h2>{activeDm?.username}</h2><p>This is the beginning of your direct message history.</p></div>}{shownMessages.map(m=><article className="message" key={m.id}><Avatar name={m.profiles?.username}/><div><div className="meta"><b>{m.profiles?.username||'member'}</b><time>{new Date(m.created_at).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time></div><p>{m.content}</p></div></article>)}<div ref={bottom}/></>}</section><form className="composer" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={view==='dms'?'Message '+(activeDm?.username||''):'Message #'+(channel?.name||'welcome')} maxLength={4000} disabled={view==='dms'?!activeDm:!channel}/><button disabled={!draft.trim()||busy||(view==='dms'?!activeDm:!channel)}>{busy?<LoaderCircle className="spin" size={18}/>:<Send size={18}/>}</button></form><footer>Made for your community on <b>defgodqe</b></footer></main></div>}
