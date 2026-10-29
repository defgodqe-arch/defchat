import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlarmClock, BrainCircuit, CalendarDays, CalendarCheck, CheckCircle2,
  Clock3, Download, Footprints, Heart, Medal, Moon, Pause, Play, Plus,
  RotateCcw, Save, ShieldCheck, Sparkles, Target, Timer, Trophy, Users, Watch,
  X, Zap, Dumbbell, Film, Upload, Link2, Scissors, Captions, DownloadCloud, AlertTriangle, Settings2
} from 'lucide-react';
import './DeffitnessStudio.css';

const today = () => new Date().toISOString().slice(0, 10);
const id = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const empty = { records: [], recovery: [], challenges: [], planner: {}, activityGoal: 150 };
const load = key => {
  try { return { ...empty, ...JSON.parse(localStorage.getItem(key) || '{}') }; }
  catch { return { ...empty }; }
};


function ClipStudio() {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('Wait for it…');
  const [duration, setDuration] = useState(30);
  const [maxClips, setMaxClips] = useState(5);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = React.useRef(null);
  const clipApi = import.meta.env.VITE_DEFFITNESS_CLIP_API || '';
  const sourceType = value => {
    try {
      const parsed = new URL(value);
      if (/youtube\.com$|youtu\.be$/.test(parsed.hostname.replace(/^www\./, ''))) return 'YouTube';
      if (/vimeo\.com$/.test(parsed.hostname.replace(/^www\./, ''))) return 'Vimeo';
      if (/twitch\.tv$/.test(parsed.hostname.replace(/^www\./, ''))) return 'Twitch';
    } catch {}
    return '';
  };
  async function analyzeUrl(event) {
    event.preventDefault();
    setError(''); setStatus(''); setJob(null);
    const provider = sourceType(url.trim());
    if (!provider) { setError('Paste a valid YouTube, Vimeo, or Twitch URL.'); return; }
    if (!clipApi) {
      setError(provider + ' link detected. URL downloading, transcript analysis, and AI moment detection need a server-side clip API. This deployment has no clip API configured yet; set VITE_DEFFITNESS_CLIP_API to your authenticated backend endpoint to enable it.'); return;
    }
    setBusy(true); setStatus('Sending the link for analysis…');
    try {
      const response = await fetch(clipApi.replace(/\/$/, '') + '/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), clipDuration: duration, maxClips, aspectRatio: '9:16', captions: true })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The clip service returned HTTP ' + response.status + '.');
      setJob(result); setStatus(result.status === 'completed' ? 'Analysis complete.' : 'Clip job submitted. Refresh status when your backend reports completion.');
    } catch (e) { setError(e.message || 'Could not reach the clip service.'); }
    finally { setBusy(false); }
  }
  function handleDrop(event) { event.preventDefault(); const dropped = event.dataTransfer?.files?.[0]; if (dropped) uploadFile({ target: { files: [dropped] } }); }
  async function uploadFile(event) {
    const selected = event.target.files?.[0];
    setError(''); setStatus(''); setJob(null);
    if (!selected) return;
    if (!selected.type.startsWith('video/')) { setError('Choose a video file.'); return; }
    if (selected.size > 1024 * 1024 * 1024) { setError('This file is over 1 GB. Choose a smaller video or use a configured server upload.'); return; }
    setFile(selected);
    setBusy(true); setProgress(0); setStatus('Inspecting local video…');
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const objectUrl = URL.createObjectURL(selected);
      video.src = objectUrl;
      await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = () => reject(new Error('The browser could not read this video format.')); });
      const seconds = Math.floor(video.duration || 0);
      URL.revokeObjectURL(objectUrl);
      if (!seconds) throw new Error('Could not read the video duration.');
      if (clipApi) {
        setStatus('Uploading video to the configured clip service…');
        const form = new FormData();
        form.append('video', selected);
        form.append('clipDuration', String(duration));
        form.append('maxClips', String(maxClips));
        form.append('aspectRatio', '9:16');
        form.append('captions', 'true');
        const response = await fetch(clipApi.replace(/\/$/, '') + '/upload', { method: 'POST', body: form });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'The clip service returned HTTP ' + response.status + '.');
        setJob(result); setStatus('Video uploaded. ' + (result.status || 'Processing has started') + '.');
      } else {
        const count = Math.min(maxClips, Math.max(1, Math.ceil(seconds / Math.max(duration * 4, 120))));
        const windows = [];
        for (let i = 0; i < count; i++) {
          const latestStart = Math.max(0, seconds - duration);
          const position = count === 1 ? 0.5 : i / (count - 1);
          const start = Math.round(latestStart * position);
          windows.push({ id: i + 1, start, end: Math.min(seconds, start + duration), title: 'Candidate ' + (i + 1), score: null });
        }
        setJob({ localOnly: true, duration: seconds, candidates: windows });
        setStatus('Video metadata loaded. These are evenly spaced candidate windows, not AI-ranked highlights; configure the clip API for transcript/audio/visual analysis and rendered captioned exports.');
      }
    } catch (e) { setError(e.message || 'Could not inspect this file.'); }
    finally { setBusy(false); }
  }
  function downloadFile() {
    if (!file) return;
    const href = URL.createObjectURL(file);
    const a = document.createElement('a'); a.href = href; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    setStatus('Downloaded the original video. Clip rendering requires the configured clip API.');
  }
  function fmt(value) { const n = Math.max(0, Number(value) || 0); return Math.floor(n / 60) + ':' + String(Math.floor(n % 60)).padStart(2, '0'); }
  return <div className="dfs-clips">
    <div className="dfs-section-title"><h3>AI Clip Studio</h3><p>Turn long videos into short-form vertical highlights. Paste a link or upload a video to get started.</p></div>
    <div className="dfs-clip-steps">{[['1','Add a source','YouTube, Vimeo, Twitch, or a local video'],['2','Find the moments','Transcript, audio energy, and scene analysis'],['3','Caption & reframe','9:16 vertical clips with animated captions'],['4','Export','Download clips individually or in a batch']].map(([n,title,desc]) => <article key={n}><span>{n}</span><b>{title}</b><small>{desc}</small></article>)}</div>
    <div className="dfs-clip-source-grid">
      <form className="dfs-panel dfs-clip-link" onSubmit={analyzeUrl}><div className="dfs-clip-icon"><Link2 size={20}/></div><h4>Paste a video link</h4><p>Accepts YouTube, Vimeo, or Twitch URLs when a clip backend is configured.</p><label>Video URL<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" required /></label><button type="submit" disabled={busy}><Scissors size={15}/>{busy ? 'Working…' : 'Find best moments'}</button></form>
      <div className="dfs-panel dfs-clip-upload"><div className="dfs-clip-icon"><Upload size={20}/></div><h4>Upload a video</h4><p>Choose a video file from your device. Local metadata inspection works without uploading it to a server.</p><button type="button" className="dfs-dropzone" onClick={() => fileRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={handleDrop}><Upload size={23}/><b>{file ? file.name : 'Choose a video or drop it here'}</b><small>{file ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : 'MP4, WebM, MOV · up to 1 GB'}</small></button><input ref={fileRef} className="dfs-file-input" type="file" accept="video/*" onChange={uploadFile} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const dropped = event.dataTransfer.files?.[0]; if (dropped) uploadFile({ target: { files: [dropped] } }); }} /></div>
    </div>
    <div className="dfs-panel dfs-clip-settings"><div><h4><Settings2 size={16}/> Clip settings</h4><p>Choose the target length and how many highlights to request.</p></div><label>Clip length<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option><option value={90}>90 seconds</option></select></label><label>Maximum clips<select value={maxClips} onChange={e => setMaxClips(Number(e.target.value))}><option value={3}>3 clips</option><option value={5}>5 clips</option><option value={10}>10 clips</option></select></label><div className="dfs-clip-caption"><Captions size={16}/><span><b>Animated captions</b><small>Request speech-to-text captions and vertical 9:16 reframing from the clip backend.</small></span><span className="dfs-clip-tag">ON</span></div></div>
    {busy && <div className="dfs-clip-progress"><i style={{width: Math.max(5,progress)+'%'}}/></div>}
    {error && <div className="dfs-clip-error" role="alert"><AlertTriangle size={17}/><span>{error}</span></div>}
    {status && <div className="dfs-clip-status" role="status"><CheckCircle2 size={16}/><span>{status}</span></div>}
    {job?.candidates && <section className="dfs-panel"><div className="dfs-panel-head"><div><h3>Candidate clip windows</h3><p>{job.localOnly ? 'Preview windows based on duration only — not AI-ranked.' : 'Candidate segments returned by the configured backend.'}</p></div>{file && <button type="button" className="dfs-outline" onClick={downloadFile}><DownloadCloud size={15}/> Download original</button>}</div>{job.candidates.map(item => <article className="dfs-candidate" key={item.id}><div><span className="dfs-candidate-time">{fmt(item.start)} – {fmt(item.end)}</span><b>{item.title || 'Highlight ' + item.id}</b><small>{item.score != null ? 'Highlight score: ' + item.score : 'Needs AI scoring'}</small></div><button type="button" className="dfs-outline" onClick={() => { setStatus('Selected ' + fmt(item.start) + '–' + fmt(item.end) + '. Actual trim/render/download requires the configured clip backend.'); }}>Select</button></article>)}</section>}
    {job && !job.candidates && <section className="dfs-panel"><h3>Clip job</h3><p>Job status: {job.status || 'submitted'}</p>{job.jobId && <p>Job ID: <code>{job.jobId}</code></p>}{Array.isArray(job.clips) && job.clips.map((clip, i) => <article className="dfs-candidate" key={clip.id || i}><div><b>{clip.title || 'Clip ' + (i + 1)}</b><small>{clip.duration ? fmt(clip.duration) : ''} {clip.url ? ' · Ready to download' : ''}</small></div>{clip.url && <a className="dfs-outline" href={clip.url} target="_blank" rel="noreferrer noopener" download><DownloadCloud size={15}/> Download</a>}</article>)}</section>}
    <div className="dfs-clip-footnote"><AlertTriangle size={15}/><p><b>Backend required for full automation.</b> Browsers cannot directly download and process most third-party YouTube/Vimeo/Twitch streams because of platform restrictions. Real AI highlight ranking, transcript captions, vertical rendering, batch exports, and social posting require a configured server-side clip service. This UI will call <code>VITE_DEFFITNESS_CLIP_API</code> when provided; no API key is exposed in the browser.</p></div>
  </div>;
}

export default function DeffitnessStudio({ userId, workouts = [], libraryMoves = [], onOpenLibrary, onOpenWorkout }) {
  const storageKey = 'defchat:deffitness-studio:v1:' + (userId || 'device');
  const [data, setData] = useState(() => load(storageKey));
  const [view, setView] = useState('dashboard');
  const [record, setRecord] = useState({ exercise: '', value: '', unit: 'kg', date: today(), note: '' });
  const [checkin, setCheckin] = useState({ date: today(), energy: '3', soreness: '2', sleep: '7', mood: '3', note: '' });
  const [challenge, setChallenge] = useState({ title: 'Complete 3 workouts', target: '3', kind: 'workouts' });
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [restLength, setRestLength] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)); }
    catch { setNotice('Storage is full. Export your data before adding more entries.'); }
  }, [data, storageKey]);

  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => setRemaining(value => {
      if (value <= 1) {
        window.clearInterval(interval);
        setRunning(false);
        setNotice('Rest timer complete — ready for your next set.');
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const weekStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date.toISOString().slice(0, 10);
  }, []);
  const weekly = workouts.filter(item => item.date >= weekStart);
  const weeklyMinutes = weekly.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const totalMinutes = workouts.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const latestRecovery = [...data.recovery].sort((a, b) => b.date.localeCompare(a.date))[0];
  const bestRecords = data.records.reduce((map, entry) => {
    const key = entry.exercise.trim().toLowerCase();
    if (!map[key] || Number(entry.value) > Number(map[key].value)) map[key] = entry;
    return map;
  }, {});
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + i);
    const key = date.toISOString().slice(0, 10);
    return { key, label: date.toLocaleDateString(undefined, { weekday: 'short' }), minutes: weekly.filter(item => item.date === key).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0) };
  });

  function saveRecord(event) {
    event.preventDefault();
    const value = Number(record.value);
    if (!record.exercise.trim() || !Number.isFinite(value) || value <= 0) {
      setNotice('Enter an exercise and a positive result.');
      return;
    }
    setData(old => ({ ...old, records: [...old.records, { ...record, exercise: record.exercise.trim(), value, id: id() }] }));
    setRecord(old => ({ ...old, exercise: '', value: '', note: '' }));
    setNotice('Personal record saved.');
  }
  function saveCheckin(event) {
    event.preventDefault();
    const entry = { ...checkin, id: id(), energy: Number(checkin.energy), soreness: Number(checkin.soreness), sleep: Number(checkin.sleep), mood: Number(checkin.mood) };
    setData(old => ({ ...old, recovery: [...old.recovery, entry] }));
    setCheckin({ date: today(), energy: '3', soreness: '2', sleep: '7', mood: '3', note: '' });
    setNotice('Recovery check-in saved.');
  }
  function saveChallenge(event) {
    event.preventDefault();
    setData(old => ({ ...old, challenges: [...old.challenges, { ...challenge, target: Math.max(1, Number(challenge.target) || 1), id: id() }] }));
    setNotice('Challenge created.');
  }
  function askCoach(event) {
    event.preventDefault();
    const q = question.trim().toLowerCase();
    if (!q) return setAnswer('Ask about workout planning, exercise selection, recovery, or progress.');
    let response = 'Choose a manageable routine, focus on controlled technique, and build consistency before increasing intensity. Track your sessions so you can learn from your own progress.';
    if (/beginner|start|new/.test(q)) response = 'Start with a small number of movements from the exercise dataset and two or three manageable sessions each week. Learn the instructions, use a comfortable range of motion, and leave recovery time between hard sessions.';
    else if (/strength|muscle|lift/.test(q)) response = 'For strength, use regular resistance training and gradual progression. Record sets, reps, and loads in your notes or personal records. Increase difficulty only while you can maintain good technique.';
    else if (/weight|fat|lose/.test(q)) response = 'Favor sustainable activity, resistance training, balanced nutrition, and sleep. Body weight naturally fluctuates; compare trends over several weeks rather than judging a single weigh-in.';
    else if (/sleep|recover|sore|tired/.test(q)) response = 'Use your recovery check-in to reflect on sleep, energy, and soreness. If you feel run down, lower the intensity or rest. Stop and seek appropriate medical help for chest pain, faintness, severe shortness of breath, or sharp pain.';
    else if (/plan|week|cardio|minutes/.test(q)) response = 'A common adult guideline is at least 150 minutes of moderate aerobic activity (or 75 minutes vigorous) per week, plus muscle-strengthening activity on at least two days. Adjust gradually to your current ability and schedule.';
    else if (/dataset|exercise|equipment/.test(q)) response = 'Open the Exercise Library to search the available dataset by muscle group, equipment, and difficulty. Add exercises there; the main workout checklist remains limited to those selected dataset entries.';
    setAnswer(response);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), studio: data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'deffitness-studio-' + today() + '.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Studio data exported.');
  }
  const tabs = [
    ['dashboard', Activity, 'Dashboard'], ['planner', CalendarDays, 'Weekly planner'],
    ['records', Medal, 'Personal records'], ['recovery', Heart, 'Recovery'],
    ['coach', BrainCircuit, 'Fitness coach'], ['challenges', Zap, 'Challenges'],
    ['connections', Watch, 'Connections'], ['clips', Film, 'AI Clip Studio']
  ];

  return <section className="dfs-root">
    <header className="dfs-heading"><div><span className="dfs-kicker"><Sparkles size={13}/> DEFFITNESS PLUS</span><h2>Train smarter. See your progress.</h2><p>Your training tools, personal milestones, recovery notes, and weekly activity in one place.</p></div><button type="button" className="dfs-outline" onClick={exportData}><Download size={15}/> Export data</button></header>
    <nav className="dfs-tabs" aria-label="Fitness studio sections">{tabs.map(([key, Icon, label]) => <button type="button" key={key} className={view === key ? 'active' : ''} onClick={() => { setView(key); setNotice(''); }}><Icon size={16}/><span>{label}</span></button>)}</nav>

    {view === 'dashboard' && <>
      <div className="dfs-hero"><div><span className="dfs-kicker">YOUR CURRENT MOMENTUM</span><h3>Small steps add up.</h3><p>You have logged {workouts.length} workouts and {totalMinutes} minutes of training so far.</p><div className="dfs-hero-actions"><button type="button" onClick={onOpenWorkout}><Dumbbell size={16}/> Open workout checklist</button><button type="button" className="dfs-secondary" onClick={onOpenLibrary}><Target size={16}/> Browse dataset</button></div></div><div className="dfs-hero-orb"><Activity size={34}/></div></div>
      <div className="dfs-stat-grid"><article><span>Workouts this week</span><strong>{weekly.length}</strong><small>Target is your scheduled days</small></article><article><span>Active minutes this week</span><strong>{weeklyMinutes}<small> / {data.activityGoal}</small></strong><div className="dfs-progress"><i style={{ width: Math.min(100, weeklyMinutes / Math.max(1, data.activityGoal) * 100) + '%' }}/></div></article><article><span>Total training time</span><strong>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</strong><small>Across all saved sessions</small></article><article><span>Dataset exercises selected</span><strong>{libraryMoves.length}</strong><small>Only selected dataset moves</small></article></div>
      <section className="dfs-panel"><div className="dfs-panel-head"><div><h3><CalendarDays size={17}/> This week at a glance</h3><p>Logged workout minutes by day.</p></div><label className="dfs-goal">Weekly active-minute goal <input type="number" min="30" max="2000" step="15" value={data.activityGoal} onChange={event => setData(old => ({ ...old, activityGoal: Math.max(30, Number(event.target.value) || 150) }))}/></label></div><div className="dfs-week-bars">{days.map(day => <div className="dfs-day-bar" key={day.key}><span>{day.minutes ? day.minutes + 'm' : '—'}</span><div className="dfs-bar-track"><i style={{ height: Math.min(100, day.minutes / Math.max(30, ...days.map(d => d.minutes)) * 100) + '%' }}/></div><b>{day.label}</b></div>)}</div><p className="dfs-note">The 150-minute target is a general adult activity guideline, not a personal medical prescription. Your dashboard counts minutes from workouts you log here.</p></section>
      <div className="dfs-shortcuts">{[['records',Medal,'Personal records','Save and compare your bests'],['recovery',Heart,'Recovery check-in','Track sleep, energy, and soreness'],['coach',BrainCircuit,'Fitness coach','Get general training guidance'],['challenges',Trophy,'Challenges','Set achievable milestones']].map(([key,Icon,title,desc]) => <button type="button" key={key} onClick={() => setView(key)}><Icon size={18}/><b>{title}</b><span>{desc}</span></button>)}</div>
      <section className="dfs-panel"><div className="dfs-panel-head"><div><h3><ShieldCheck size={17}/> Your data</h3><p>Saved locally in this browser for this profile. Export a backup before clearing browser data.</p></div></div><button type="button" className="dfs-outline" onClick={exportData}><Download size={15}/> Download studio backup</button> <button type="button" className="dfs-danger" onClick={() => { if (window.confirm('Clear Deffitness Studio records, recovery logs, and challenges stored on this device?')) { setData({ ...empty }); setNotice('Studio data cleared.'); } }}>Clear studio data</button></section>
    </>}

    {view === 'planner' && <><div className="dfs-section-title"><h3>Weekly training planner</h3><p>Move sessions around to fit your week. Keep rest days flexible.</p></div><div className="dfs-planner-grid">{days.map((day, index) => <article key={day.key} className="dfs-planner-day"><span>{day.label}</span><b>{day.key === today() ? 'Today' : new Date(day.key + 'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}</b><select value={data.planner[day.key] || 'rest'} onChange={event => setData(old => ({ ...old, planner: { ...old.planner, [day.key]: event.target.value } }))}><option value="rest">Rest / recovery</option><option value="strength">Strength</option><option value="cardio">Cardio / aerobic</option><option value="mobility">Mobility / core</option><option value="flexible">Flexible activity</option></select><small>{day.minutes ? day.minutes + ' logged minutes' : 'No workout logged'}</small>{day.key === today() && <button type="button" onClick={onOpenWorkout}>Open workout</button>}</article>)}</div><p className="dfs-note">This planner stores your choices in this browser. It does not automatically create exercises; add dataset exercises in the Exercise Library.</p></>}

    {view === 'records' && <><div className="dfs-section-title"><h3>Personal records</h3><p>Save best lifts, reps, distance, or duration. Keep units consistent for meaningful comparisons.</p></div><form className="dfs-form dfs-panel" onSubmit={saveRecord}><label>Exercise or activity<input maxLength="100" required value={record.exercise} onChange={event => setRecord(old => ({ ...old, exercise: event.target.value }))} placeholder="e.g. Squat"/></label><label>Value<input type="number" min=".1" step="any" required value={record.value} onChange={event => setRecord(old => ({ ...old, value: event.target.value }))} placeholder="e.g. 60"/></label><label>Unit<select value={record.unit} onChange={event => setRecord(old => ({ ...old, unit: event.target.value }))}><option>kg</option><option>lb</option><option>reps</option><option>km</option><option>min</option><option>sec</option></select></label><label>Date<input type="date" max={today()} value={record.date} onChange={event => setRecord(old => ({ ...old, date: event.target.value }))}/></label><label className="dfs-wide">Note<input maxLength="120" value={record.note} onChange={event => setRecord(old => ({ ...old, note: event.target.value }))} placeholder="Optional context"/></label><button type="submit"><Save size={15}/> Save record</button></form><div className="dfs-record-grid">{Object.values(bestRecords).map(entry => <article key={entry.exercise.toLowerCase()}><Medal size={19}/><small>PERSONAL BEST</small><h4>{entry.exercise}</h4><strong>{entry.value} {entry.unit}</strong><p>{entry.date}</p></article>)}</div>{data.records.length > 0 && <section className="dfs-panel"><h3>Record history</h3>{[...data.records].sort((a,b) => b.date.localeCompare(a.date)).map(entry => <div className="dfs-list-row" key={entry.id}><span><b>{entry.exercise} · {entry.value} {entry.unit}</b><small>{entry.date}{entry.note ? ' · ' + entry.note : ''}</small></span><button type="button" aria-label="Delete record" onClick={() => setData(old => ({ ...old, records: old.records.filter(item => item.id !== entry.id) }))}><X size={15}/></button></div>)}</section>}</>}

    {view === 'recovery' && <><div className="dfs-section-title"><h3>Recovery and readiness</h3><p>Optional check-in for sleep, energy, soreness, and mood. This is not a medical assessment.</p></div><form className="dfs-form dfs-panel" onSubmit={saveCheckin}><label>Energy (1 low – 5 high)<select value={checkin.energy} onChange={event => setCheckin(old => ({ ...old, energy: event.target.value }))}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label><label>Soreness (1 none – 5 high)<select value={checkin.soreness} onChange={event => setCheckin(old => ({ ...old, soreness: event.target.value }))}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label><label>Sleep hours<input type="number" min="0" max="24" step=".5" value={checkin.sleep} onChange={event => setCheckin(old => ({ ...old, sleep: event.target.value }))}/></label><label>Mood (1 low – 5 high)<select value={checkin.mood} onChange={event => setCheckin(old => ({ ...old, mood: event.target.value }))}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label><label>Date<input type="date" max={today()} value={checkin.date} onChange={event => setCheckin(old => ({ ...old, date: event.target.value }))}/></label><label className="dfs-wide">Notes<input maxLength="180" value={checkin.note} onChange={event => setCheckin(old => ({ ...old, note: event.target.value }))} placeholder="Optional context"/></label><button type="submit"><Save size={15}/> Save check-in</button></form>{latestRecovery && <section className="dfs-panel"><h3><Heart size={17}/> Latest check-in · {latestRecovery.date}</h3><div className="dfs-recovery-stats"><span><b>{latestRecovery.energy}/5</b>Energy</span><span><b>{latestRecovery.soreness}/5</b>Soreness</span><span><b>{latestRecovery.sleep}h</b>Sleep</span><span><b>{latestRecovery.mood}/5</b>Mood</span></div><p>{latestRecovery.energy <= 2 || latestRecovery.soreness >= 4 || latestRecovery.sleep < 6 ? 'You noted low energy, higher soreness, or limited sleep. Consider a lighter session or rest if you feel run down.' : 'Check-in saved. Keep adjusting your training to how you feel.'}</p></section>}{data.recovery.length > 0 && <section className="dfs-panel"><h3>Check-in history</h3>{[...data.recovery].sort((a,b) => b.date.localeCompare(a.date)).map(entry => <div className="dfs-list-row" key={entry.id}><span><b>{entry.date} · Energy {entry.energy}/5 · Soreness {entry.soreness}/5</b><small>{entry.sleep} hours sleep · Mood {entry.mood}/5 {entry.note ? ' · ' + entry.note : ''}</small></span><button type="button" onClick={() => setData(old => ({ ...old, recovery: old.recovery.filter(item => item.id !== entry.id) }))} aria-label="Delete check-in"><X size={15}/></button></div>)}</section>}</>}

    {view === 'coach' && <><section className="dfs-coach-hero"><BrainCircuit size={28}/><div><span className="dfs-kicker">BUILT-IN FITNESS COACH</span><h3>Ask about your next step.</h3><p>This first version uses local guidance rules, not a connected AI model. It cannot diagnose health conditions.</p></div></section><div className="dfs-prompt-list">{['I am a beginner. How should I start?','How can I build strength?','How should I approach recovery?','How do I use the exercise dataset?'].map(item => <button type="button" key={item} onClick={() => { setQuestion(item); setAnswer(item.includes('beginner') ? 'Start with a few dataset movements you can perform comfortably, schedule two or three manageable sessions, and learn the instructions before increasing load.' : item.includes('strength') ? 'Prioritize regular resistance training, controlled technique, and gradual progression. Record your sets, reps, and loads so you can compare sessions.' : item.includes('recovery') ? 'Track sleep, energy, and soreness in Recovery. If unusually fatigued, consider an easier session or rest.' : 'Search the Exercise Library by muscle group, equipment, and difficulty, then add only the dataset exercises you want in your checklist.'); }}><Sparkles size={14}/>{item}</button>)}</div><form className="dfs-panel dfs-coach-form" onSubmit={askCoach}><label htmlFor="dfs-question">Your question</label><textarea id="dfs-question" rows="3" maxLength="500" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about training, recovery, planning, or exercise data…"/><button type="submit"><BrainCircuit size={15}/> Get guidance</button>{answer && <div className="dfs-answer"><b><Sparkles size={14}/> COACH RESPONSE</b><p>{answer}</p></div>}</form><p className="dfs-note">General educational guidance only. For injury, medical conditions, or persistent pain, consult a qualified professional.</p></>}

    {view === 'challenges' && <><div className="dfs-section-title"><h3>Challenges and milestones</h3><p>Set personal goals that encourage consistency, not unsafe amounts of exercise.</p></div><form className="dfs-form dfs-panel" onSubmit={saveChallenge}><label>Challenge name<input required maxLength="100" value={challenge.title} onChange={event => setChallenge(old => ({ ...old, title: event.target.value }))}/></label><label>Target<input type="number" min="1" max="1000" required value={challenge.target} onChange={event => setChallenge(old => ({ ...old, target: event.target.value }))}/></label><label>Measure<select value={challenge.kind} onChange={event => setChallenge(old => ({ ...old, kind: event.target.value }))}><option value="workouts">Completed workouts</option><option value="minutes">Total training minutes</option><option value="exercises">Logged exercises</option></select></label><button type="submit"><Plus size={15}/> Create challenge</button></form><div className="dfs-record-grid">{data.challenges.map(item => { const value = item.kind === 'workouts' ? workouts.length : item.kind === 'minutes' ? totalMinutes : workouts.reduce((sum, workout) => sum + (workout.exercises?.length || 0), 0); const percent = Math.min(100, Math.round(value / Math.max(1, Number(item.target)) * 100)); return <article key={item.id}><Zap size={19}/><small>{percent >= 100 ? 'GOAL REACHED' : 'YOUR CHALLENGE'}</small><h4>{item.title}</h4><strong>{Math.min(value, item.target)} / {item.target}</strong><div className="dfs-progress"><i style={{ width: percent + '%' }}/></div><p>{percent >= 100 ? 'Goal complete — great work.' : 'Keep going at a sustainable pace.'}</p><button type="button" className="dfs-text-button" onClick={() => setData(old => ({ ...old, challenges: old.challenges.filter(ch => ch.id !== item.id) }))}>Remove</button></article>; })}</div>{data.challenges.length === 0 && <div className="dfs-empty"><Trophy size={25}/><b>Your next milestone starts here.</b><span>Create a challenge to track workouts, minutes, or exercise completions.</span></div>}</>}

    {view === 'clips' && <ClipStudio />}

    {view === 'connections' && <><div className="dfs-section-title"><h3>Health, devices, reminders, and privacy</h3><p>Connection cards are transparent about what is and is not active.</p></div><div className="dfs-connections"><article><Watch size={22}/><div><h4>Apple Health / Health Connect</h4><p>Wearable syncing for steps, activity, and heart-rate data is not connected in this web build. A native/mobile permission flow and platform-specific integration are required.</p><small>Not connected</small></div></article><article><CalendarCheck size={22}/><div><h4>Workout reminders</h4><p>This panel does not schedule background notifications. Use your device calendar for reminders; browser notifications would need permission and service-worker support.</p><small>Not configured</small></div></article><article><Users size={22}/><div><h4>Friends and shared challenges</h4><p>Challenges are private and local right now. Shared leaderboards require a secure backend, authentication, access rules, and explicit opt-in.</p><small>Local-only</small></div></article><article><ShieldCheck size={22}/><div><h4>Privacy and backup</h4><p>Your Studio entries are saved in this browser's local storage. Export a backup before clearing browser data. Use the dashboard to export or clear Studio entries.</p><small>Device storage</small></div></article></div></>}
    {notice && <div className="dfs-notice" role="status"><CheckCircle2 size={15}/>{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={14}/></button></div>}
    <section className="dfs-panel dfs-rest"><div className="dfs-panel-head"><div><h3><AlarmClock size={17}/> Rest timer</h3><p>Use between sets. It runs while the app is open.</p></div><strong className="dfs-clock">{Math.floor(remaining / 60).toString().padStart(2,'0')}:{(remaining % 60).toString().padStart(2,'0')}</strong></div><div className="dfs-timer-actions"><label>Rest length<select value={restLength} onChange={event => { const value = Number(event.target.value); setRestLength(value); setRemaining(value); setRunning(false); }}><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option><option value={90}>90 seconds</option><option value={120}>2 minutes</option><option value={180}>3 minutes</option></select></label><button type="button" onClick={() => { if (remaining <= 0) setRemaining(restLength); setRunning(value => !value); }}>{running ? <Pause size={15}/> : <Play size={15}/>} {running ? 'Pause' : 'Start rest'}</button><button type="button" className="dfs-outline" onClick={() => { setRunning(false); setRemaining(restLength); }}><RotateCcw size={15}/> Reset</button></div></section>
  </section>;
}
