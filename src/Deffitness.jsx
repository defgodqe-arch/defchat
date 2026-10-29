import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Check,
  CheckCircle2, ChevronDown, Clock3, Dumbbell, Download, HeartPulse, History,
  ListChecks, Plus, Ruler, Scale, Settings2, Sparkles, Target, Timer,
  TrendingDown, TrendingUp, Trophy, X
} from 'lucide-react';
import './Deffitness.css';

const STORAGE_PREFIX = 'defchat:deffitness:v1:';
const EMPTY = { profile: null, weightLogs: [], workouts: [], measurements: [] };
const today = () => new Date().toISOString().slice(0, 10);
const makeId = () => (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const toKg = (v, unit) => Number(v) * (unit === 'lb' ? 0.45359237 : 1);
const fromKg = (v, unit) => Number(v) / (unit === 'lb' ? 0.45359237 : 1);
const showWeight = (v, unit) => Number.isFinite(Number(v)) ? fromKg(v, unit).toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : '—';
const dateLabel = value => value ? new Date(value + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const prettyMinutes = mins => mins >= 60 ? Math.floor(mins / 60) + 'h ' + mins % 60 + 'm' : mins + ' min';

function makeRoutines(profile) {
  const gear = profile?.equipment || 'bodyweight';
  const level = profile?.level || 'beginner';
  const sets = level === 'beginner' ? '2–3 sets' : level === 'advanced' ? '3–4 sets' : '3 sets';
  const rest = level === 'beginner' ? '60–90 sec rest' : '60–120 sec rest';
  const choose = (body, dumbbell, gym) => gear === 'gym' ? gym : gear === 'dumbbells' ? dumbbell : body;
  const exercise = (body, dumbbell, gym, reps, tip) => ({
    name: choose(body, dumbbell, gym),
    prescription: reps,
    sets: /walk|bike|treadmill|marching/i.test(choose(body, dumbbell, gym)) ? '1 round' : sets,
    rest,
    tip
  });
  const routines = [
    {
      id: 'full-a', title: 'Full Body A', focus: 'Build a balanced base', icon: '☀️',
      intro: 'A balanced session covering legs, pushing, pulling, and core.',
      exercises: [
        exercise('Chair sit-to-stand', 'Goblet squat', 'Leg press', '8–12 reps', 'Move smoothly and keep your whole foot grounded.'),
        exercise('Wall or incline push-up', 'Dumbbell floor press', 'Machine chest press', '8–12 reps', 'Keep your body steady and stop before form slips.'),
        exercise('Prone W raise', 'One-arm dumbbell row', 'Seated cable row', '10–12 reps', 'Draw the shoulder blades gently back; avoid shrugging.'),
        exercise('Glute bridge', 'Dumbbell Romanian deadlift', 'Seated leg curl', '10–15 reps', 'Use a comfortable range and control the lowering phase.'),
        exercise('Dead bug', 'Dead bug', 'Pallof press', '6–10 each side', 'Breathe steadily and keep the movement controlled.')
      ]
    },
    {
      id: 'lower-core', title: 'Lower Body + Core', focus: 'Leg strength and stability', icon: '🌱',
      intro: 'Practice lower-body control, hips, and trunk stability.',
      exercises: [
        exercise('Supported reverse lunge', 'Dumbbell reverse lunge', 'Leg press', '8–10 each side', 'Use a stable support if balance is challenging.'),
        exercise('Hip hinge / good morning', 'Dumbbell Romanian deadlift', 'Seated leg curl', '8–12 reps', 'Push hips back and keep your back comfortable.'),
        exercise('Calf raise', 'Standing dumbbell calf raise', 'Calf raise machine', '12–15 reps', 'Pause briefly at the top without bouncing.'),
        exercise('Bird dog', 'Bird dog', 'Cable anti-rotation press', '8–10 each side', 'Keep hips level; quality matters more than speed.'),
        exercise('Comfortable brisk walk', 'Comfortable brisk walk', 'Bike or treadmill', '8–15 minutes', 'Choose a pace where you can still talk.')
      ]
    },
    {
      id: 'upper-full', title: 'Upper Body + Full Body', focus: 'Upper-body strength and movement', icon: '⚡',
      intro: 'Practice upper-body pushing and pulling, then finish with easy movement.',
      exercises: [
        exercise('Incline push-up', 'Dumbbell shoulder press', 'Machine shoulder press', '8–12 reps', 'Choose a load or height that lets you stay in control.'),
        exercise('Prone W raise', 'Dumbbell row', 'Lat pulldown', '8–12 reps', 'Pull with your back, not momentum.'),
        exercise('Chair squat', 'Dumbbell split squat', 'Goblet squat or leg press', '8–12 reps', 'Use a comfortable depth and stable footing.'),
        exercise('Side plank from knees', 'Side plank', 'Cable chop (light)', '15–30 sec / side', 'Keep breathing; stop if you feel sharp pain.'),
        exercise('Comfortable brisk walk', 'Comfortable brisk walk', 'Bike or treadmill', '8–15 minutes', 'Finish feeling like you could do a little more.')
      ]
    },
    {
      id: 'mobility', title: 'Mobility + Easy Cardio', focus: 'Recovery and consistency', icon: '🌤️',
      intro: 'A lighter option for moving on a recovery day.',
      exercises: [
        exercise('Gentle marching in place', 'Gentle marching in place', 'Easy bike', '3–5 minutes', 'Start easy and let breathing settle.'),
        exercise('Hip-flexor stretch', 'Hip-flexor stretch', 'Hip-flexor stretch', '20–30 sec / side', 'Stretch gently; do not force your range.'),
        exercise('Wall slides', 'Wall slides', 'Wall slides', '8–12 reps', 'Stay in a pain-free range.'),
        exercise('Bird dog', 'Bird dog', 'Bird dog', '8 each side', 'Move slowly and keep the trunk steady.'),
        exercise('Easy walk', 'Easy walk', 'Easy walk or treadmill', '10–20 minutes', 'Finish feeling refreshed, not exhausted.')
      ]
    }
  ];
  return routines;
}

function TrendChart({ logs, unit }) {
  const recent = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
  if (recent.length < 2) return <div className="df-chart-empty"><TrendingUp size={24}/><b>Your trend appears here</b><span>Add at least two weigh-ins to see your graph.</span></div>;
  const values = recent.map(item => fromKg(item.kg, unit));
  const min = Math.min(...values), max = Math.max(...values), range = Math.max(max - min, 1);
  const points = values.map((value, index) => ({ x: 28 + index * (544 / (values.length - 1)), y: 128 - ((value - min) / range) * 92 }));
  const polyline = points.map(point => point.x + ',' + point.y).join(' ');
  return <div className="df-chart-wrap"><svg className="df-chart" viewBox="0 0 600 178" role="img" aria-label={'Weight trend in ' + unit}>
    {[36, 82, 128].map(y => <line key={y} x1="28" x2="572" y1={y} y2={y} className="df-chart-grid"/>)}
    <polygon points={'28,145 ' + polyline + ' 572,145'} className="df-chart-area"/>
    <polyline points={polyline} className="df-chart-line"/>
    {points.map((point, index) => <circle key={recent[index].id} cx={point.x} cy={point.y} r="4" className="df-chart-dot"><title>{dateLabel(recent[index].date)}: {values[index].toFixed(1)} {unit}</title></circle>)}
    <text x="28" y="166" className="df-chart-label">{dateLabel(recent[0].date)}</text>
    <text x="572" y="166" textAnchor="end" className="df-chart-label">{dateLabel(recent[recent.length - 1].date)}</text>
    <text x="28" y="18" className="df-chart-label">{max.toFixed(1)} {unit}</text>
    <text x="28" y="143" className="df-chart-label">{min.toFixed(1)} {unit}</text>
  </svg></div>;
}

function saveDownload(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Deffitness({ userId, onClose }) {
  const storageKey = STORAGE_PREFIX + (userId || 'device');
  const [data, setData] = useState(() => {
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; }
    catch { return EMPTY; }
  });
  const [tab, setTab] = useState('overview');
  const [showSetup, setShowSetup] = useState(!data.profile);
  const [profileDraft, setProfileDraft] = useState(() => data.profile || {
    goal: 'get-stronger', level: 'beginner', days: 3, minutes: 35,
    equipment: 'bodyweight', heightCm: 170, unit: 'kg', currentWeightKg: '',
    targetWeightKg: '', startDate: today()
  });
  const [weightValue, setWeightValue] = useState('');
  const [weightDate, setWeightDate] = useState(today());
  const [weightNote, setWeightNote] = useState('');
  const [measurementDraft, setMeasurementDraft] = useState({ date: today(), waist: '', hips: '', chest: '', notes: '' });
  const [activeRoutine, setActiveRoutine] = useState('full-a');
  const [checkedExercises, setCheckedExercises] = useState([]);
  const [sessionMinutes, setSessionMinutes] = useState(35);
  const [sessionNote, setSessionNote] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)); }
    catch { setNotice('Device storage is full. Export your data and remove older entries to keep tracking.'); }
  }, [data, storageKey]);

  const routines = useMemo(() => makeRoutines(data.profile || profileDraft), [data.profile, profileDraft.equipment, profileDraft.level]);
  const routine = routines.find(item => item.id === activeRoutine) || routines[0];
  const sortedWeights = useMemo(() => [...data.weightLogs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt), [data.weightLogs]);
  const latestWeight = sortedWeights.length ? sortedWeights[sortedWeights.length - 1] : null;
  const firstWeight = sortedWeights[0] || null;
  const changeKg = latestWeight && firstWeight ? latestWeight.kg - firstWeight.kg : null;
  const weekStartDate = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); }, []);
  const weeklyWorkouts = data.workouts.filter(item => item.date >= weekStartDate).length;
  const totalMinutes = data.workouts.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const goalLabel = ({ 'get-stronger': 'Build strength', 'build-muscle': 'Build muscle', 'improve-fitness': 'Improve fitness', 'lose-weight': 'Weight management', 'stay-active': 'Stay active' })[data.profile?.goal] || 'Build a consistent habit';
  const weeklyTarget = Number(data.profile?.days || 3);

  function saveProfile(event) {
    event.preventDefault();
    const p = { ...profileDraft, days: Number(profileDraft.days), minutes: Number(profileDraft.minutes), heightCm: Number(profileDraft.heightCm) || 170 };
    const current = Number(profileDraft.currentWeightKg);
    if (!data.profile && Number.isFinite(current) && current > 0) {
      setData(old => ({ ...old, profile: p, weightLogs: [...old.weightLogs, { id: makeId(), date: p.startDate || today(), kg: toKg(current, p.unit), note: 'Starting weight', createdAt: Date.now() }] }));
    } else setData(old => ({ ...old, profile: p }));
    setProfileDraft(p); setShowSetup(false); setNotice('Your plan is ready. You can change it any time.'); setTab('overview');
  }
  function addWeight(event) {
    event.preventDefault();
    const input = Number(weightValue);
    if (!Number.isFinite(input) || input <= 0 || input > 700) { setNotice('Enter a valid weight before saving.'); return; }
    setData(old => ({ ...old, weightLogs: [...old.weightLogs, { id: makeId(), date: weightDate || today(), kg: toKg(input, data.profile?.unit || 'kg'), note: weightNote.trim().slice(0, 120), createdAt: Date.now() }] }));
    setWeightValue(''); setWeightNote(''); setNotice('Weigh-in saved.');
  }
  function removeWeight(entryId) {
    setData(old => ({ ...old, weightLogs: old.weightLogs.filter(entry => entry.id !== entryId) }));
  }
  function addMeasurements(event) {
    event.preventDefault();
    const entry = { id: makeId(), date: measurementDraft.date || today(), notes: measurementDraft.notes.trim().slice(0, 120), waist: Number(measurementDraft.waist) || null, hips: Number(measurementDraft.hips) || null, chest: Number(measurementDraft.chest) || null };
    if (!entry.waist && !entry.hips && !entry.chest) { setNotice('Enter at least one measurement.'); return; }
    setData(old => ({ ...old, measurements: [...old.measurements, entry] }));
    setMeasurementDraft({ date: today(), waist: '', hips: '', chest: '', notes: '' }); setNotice('Measurements saved.');
  }
  function completeWorkout() {
    if (!checkedExercises.length) { setNotice('Tick at least one completed exercise first.'); return; }
    setData(old => ({ ...old, workouts: [...old.workouts, { id: makeId(), date: today(), routineId: routine.id, title: routine.title, exercises: [...checkedExercises], minutes: Math.max(1, Number(sessionMinutes) || 1), note: sessionNote.trim().slice(0, 240), createdAt: Date.now() }] }));
    setCheckedExercises([]); setSessionNote(''); setNotice('Workout logged — great job showing up.'); setTab('overview');
  }
  function exportData() {
    saveDownload('deffitness-progress-' + today() + '.json', JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2), 'application/json');
    setNotice('Progress export downloaded.');
  }
  function toggleCheck(index) {
    setCheckedExercises(old => old.includes(index) ? old.filter(item => item !== index) : [...old, index]);
  }

  const nav = [
    ['overview', Activity, 'Overview'],
    ['plan', CalendarDays, 'My plan'],
    ['workout', Dumbbell, 'Workout'],
    ['progress', BarChart3, 'Progress'],
    ['history', History, 'History']
  ];
  const unit = data.profile?.unit || profileDraft.unit || 'kg';

  return <div className="df-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="df-app" role="dialog" aria-modal="true" aria-labelledby="df-title">
      <aside className="df-sidebar">
        <div className="df-brand"><span className="df-brand-mark"><Activity size={22}/></span><div><small>YOUR FREE FITNESS COACH</small><h2>deffitness</h2></div></div>
        <div className="df-nav-label">YOUR SPACE</div>
        {nav.map(([key, Icon, label]) => <button type="button" key={key} className={'df-nav-item' + (tab === key ? ' active' : '')} onClick={() => { setTab(key); setNotice(''); }}><Icon size={17}/><span>{label}</span>{key === 'workout' && <span className="df-nav-hot">GO</span>}</button>)}
        <div className="df-sidebar-bottom">
          <div className="df-local-note"><span className="df-local-dot"/><span>Private on this device</span></div>
          <button type="button" className="df-export-button" onClick={exportData}><Download size={15}/> Export my data</button>
          <button type="button" className="df-close-button" onClick={onClose}><X size={16}/> Back to defchat</button>
        </div>
      </aside>
      <main className="df-main">
        <header className="df-topbar"><div><div className="df-date-label">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div><h1 id="df-title">{tab === 'overview' ? 'Your fitness, your pace.' : tab === 'plan' ? 'Your training plan' : tab === 'workout' ? 'Let’s get moving.' : tab === 'progress' ? 'Every step counts.' : 'Your workout history'}</h1></div><div className="df-top-actions"><span className="df-free-pill"><Sparkles size={13}/> FREE FOREVER</span><button type="button" aria-label="Close deffitness" className="df-top-close" onClick={onClose}><X size={19}/></button></div></header>
        <div className="df-body">
          {showSetup && <section className="df-setup-card"><div className="df-setup-head"><span className="df-setup-icon"><Target size={20}/></span><div><h2>Build your personal plan</h2><p>Pick a goal and we'll adapt routines to your experience and equipment.</p></div></div>
            <form className="df-setup-grid" onSubmit={saveProfile}>
              <label>Primary goal<select value={profileDraft.goal} onChange={e => setProfileDraft(p => ({ ...p, goal: e.target.value }))}><option value="get-stronger">Get stronger</option><option value="build-muscle">Build muscle</option><option value="improve-fitness">Improve fitness</option><option value="lose-weight">Weight management</option><option value="stay-active">Stay active</option></select></label>
              <label>Experience<select value={profileDraft.level} onChange={e => setProfileDraft(p => ({ ...p, level: e.target.value }))}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
              <label>Days per week<select value={profileDraft.days} onChange={e => setProfileDraft(p => ({ ...p, days: Number(e.target.value) }))}>{[2,3,4,5,6].map(day => <option key={day} value={day}>{day} days</option>)}</select></label>
              <label>Equipment<select value={profileDraft.equipment} onChange={e => setProfileDraft(p => ({ ...p, equipment: e.target.value }))}><option value="bodyweight">No equipment</option><option value="dumbbells">Dumbbells at home</option><option value="gym">Full gym</option></select></label>
              <label>Session length<select value={profileDraft.minutes} onChange={e => setProfileDraft(p => ({ ...p, minutes: Number(e.target.value) }))}>{[15,20,30,35,45,60,75].map(min => <option key={min} value={min}>{min} minutes</option>)}</select></label>
              <label>Height (cm)<input type="number" min="80" max="250" value={profileDraft.heightCm} onChange={e => setProfileDraft(p => ({ ...p, heightCm: e.target.value }))}/></label>
              <label>Weight unit<select value={profileDraft.unit} onChange={e => setProfileDraft(p => ({ ...p, unit: e.target.value }))}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option></select></label>
              <label>Current weight (optional)<input type="number" min="1" max="700" step="0.1" placeholder={'Weight in ' + profileDraft.unit} value={profileDraft.currentWeightKg} onChange={e => setProfileDraft(p => ({ ...p, currentWeightKg: e.target.value }))}/></label>
              <label>Target weight (optional)<input type="number" min="1" max="700" step="0.1" placeholder={'Weight in ' + profileDraft.unit} value={profileDraft.targetWeightKg} onChange={e => setProfileDraft(p => ({ ...p, targetWeightKg: e.target.value }))}/></label>
              <button className="df-primary-button df-setup-submit" type="submit"><Sparkles size={16}/> Create my plan</button>
            </form>
            <p className="df-disclaimer">No paid tier, supplements, or special equipment required. This is general fitness guidance, not medical care.</p>
          </section>}

          {!showSetup && tab === 'overview' && <>
            <section className="df-hero-card"><div className="df-hero-copy"><span className="df-eyebrow"><Sparkles size={13}/> YOUR PERSONAL GAME PLAN</span><h2>{goalLabel}</h2><p>{data.profile?.days || 3} days a week · {data.profile?.minutes || 35} min sessions · {data.profile?.level || 'beginner'} level</p><div className="df-hero-actions"><button type="button" className="df-primary-button" onClick={() => { setTab('workout'); setShowSetup(false); }}><Dumbbell size={16}/> Start a workout</button><button type="button" className="df-ghost-button" onClick={() => setShowSetup(true)}><Settings2 size={15}/> Edit plan</button></div></div><div className="df-hero-art"><div className="df-orbit orbit-one"/><div className="df-orbit orbit-two"/><div className="df-sun"><Activity size={34}/></div><span className="df-spark df-spark-one">✦</span><span className="df-spark df-spark-two">✧</span></div></section>
            <div className="df-stat-grid">
              <article className="df-stat-card"><span className="df-stat-icon"><CheckCircle2 size={18}/></span><span className="df-stat-label">Workouts this week</span><strong>{weeklyWorkouts}<small> / {weeklyTarget}</small></strong><div className="df-mini-progress"><i style={{ width: Math.min(100, weeklyWorkouts / weeklyTarget * 100) + '%' }}/></div></article>
              <article className="df-stat-card"><span className="df-stat-icon"><Scale size={18}/></span><span className="df-stat-label">Latest weight</span><strong>{latestWeight ? showWeight(latestWeight.kg, unit) : '—'}<small> {latestWeight ? unit : 'Add a weigh-in'}</small></strong><span className="df-stat-foot">{latestWeight ? dateLabel(latestWeight.date) : 'Your data stays private'}</span></article>
              <article className="df-stat-card"><span className="df-stat-icon"><Timer size={18}/></span><span className="df-stat-label">Total training time</span><strong>{prettyMinutes(totalMinutes)}</strong><span className="df-stat-foot">Across {data.workouts.length} logged sessions</span></article>
              <article className="df-stat-card"><span className="df-stat-icon"><Trophy size={18}/></span><span className="df-stat-label">Consistency</span><strong>{data.workouts.length ? Math.min(100, Math.round(data.workouts.length / Math.max(1, Math.ceil((Date.now() - (data.profile?.startDate ? Date.parse(data.profile.startDate + 'T12:00:00') : Date.now())) / 604800000)) * 100)) : 0}<small>%</small></strong><span className="df-stat-foot">Every session is progress</span></article>
            </div>
            <div className="df-section-heading"><div><h2>This week’s plan</h2><p>Pick the workout that fits your energy today.</p></div><button type="button" className="df-text-button" onClick={() => setTab('plan')}>View plan <ChevronDown size={14}/></button></div>
            <div className="df-routine-grid">{routines.slice(0, 3).map(item => <button type="button" key={item.id} className="df-routine-card" onClick={() => { setActiveRoutine(item.id); setCheckedExercises([]); setTab('workout'); }}><span className="df-routine-art">{item.icon}</span><span className="df-routine-title">{item.title}</span><span className="df-routine-focus">{item.focus}</span><span className="df-routine-meta"><Clock3 size={13}/> {data.profile?.minutes || 35} min <span>·</span> {item.exercises.length} exercises</span></button>)}</div>
            <div className="df-section-heading"><div><h2>Weight trend</h2><p>Focus on patterns, not day-to-day fluctuations.</p></div><button type="button" className="df-text-button" onClick={() => setTab('progress')}>View progress <ChevronDown size={14}/></button></div>
            <section className="df-panel"><div className="df-panel-head"><div><b>Your weight</b><small>{data.weightLogs.length} weigh-ins logged</small></div>{latestWeight && <strong>{showWeight(latestWeight.kg, unit)} {unit}</strong>}</div><TrendChart logs={data.weightLogs} unit={unit}/></section>
          </>}

          {!showSetup && tab === 'plan' && <>
            <section className="df-intro-card"><span className="df-intro-icon"><CalendarDays size={21}/></span><div><h2>Your weekly rhythm</h2><p>A flexible {weeklyTarget}-day plan. Rest and recovery are part of training too.</p></div><button type="button" className="df-ghost-button" onClick={() => setShowSetup(true)}><Settings2 size={15}/> Edit</button></section>
            <div className="df-schedule-grid">{Array.from({ length: 7 }, (_, index) => ({ day: index, label: new Date(Date.now() - ((new Date().getDay() + 6) % 7) * 86400000 + index * 86400000).toLocaleDateString(undefined, { weekday: 'short' }) })).map((item, index) => { const sessionDay = index < weeklyTarget; const plan = sessionDay ? routines[index % 3] : routines[3]; const finished = data.workouts.some(workout => workout.date === today() && workout.routineId === plan.id); return <button type="button" key={item.day} className={'df-schedule-day' + (sessionDay ? ' training-day' : ' rest-day')} onClick={() => { setActiveRoutine(plan.id); setCheckedExercises([]); setTab('workout'); }}><span className="df-schedule-label">{item.label}</span><span className="df-schedule-symbol">{finished ? <Check size={17}/> : sessionDay ? plan.icon : '☾'}</span><b>{finished ? 'Done' : sessionDay ? plan.title : 'Recovery'}</b><small>{sessionDay ? data.profile?.minutes || 35 : 'Easy movement' } {sessionDay ? 'min' : 'optional'}</small></button>; })}</div>
            <div className="df-section-heading"><div><h2>Your routines</h2><p>Exercises adjust to your equipment and experience.</p></div></div>
            <div className="df-plan-list">{routines.map(item => <article key={item.id} className="df-plan-row"><div className="df-plan-row-art">{item.icon}</div><div className="df-plan-row-copy"><b>{item.title}</b><span>{item.focus}</span><small>{item.exercises.length} exercises · {data.profile?.minutes || 35} minutes</small></div><button type="button" className="df-primary-button" onClick={() => { setActiveRoutine(item.id); setCheckedExercises([]); setTab('workout'); }}>Open workout <ChevronDown size={14}/></button></article>)}</div>
          </>}

          {!showSetup && tab === 'workout' && <>
            <section className="df-workout-select"><div><span className="df-eyebrow"><Dumbbell size={13}/> TRAINING SESSION</span><h2>Choose your routine</h2><p>Start easy, use controlled movement, and take rests as needed.</p></div><select value={activeRoutine} onChange={e => { setActiveRoutine(e.target.value); setCheckedExercises([]); }} aria-label="Select routine">{routines.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></section>
            <section className="df-workout-banner"><div className="df-workout-banner-icon">{routine.icon}</div><div><h2>{routine.title}</h2><p>{routine.intro}</p><div className="df-workout-tags"><span><Clock3 size={12}/> {data.profile?.minutes || 35} min</span><span><ListChecks size={12}/> {routine.exercises.length} moves</span><span><Target size={12}/> {data.profile?.level || 'beginner'}</span></div></div></section>
            <div className="df-exercise-list">{routine.exercises.map((exercise, index) => <article key={routine.id + '-' + index} className={'df-exercise-row' + (checkedExercises.includes(index) ? ' completed' : '')}><button type="button" className="df-exercise-check" onClick={() => toggleCheck(index)} aria-label={(checkedExercises.includes(index) ? 'Uncheck ' : 'Complete ') + exercise.name}>{checkedExercises.includes(index) ? <Check size={17}/> : <span>{String(index + 1).padStart(2, '0')}</span>}</button><div className="df-exercise-copy"><b>{exercise.name}</b><span>{exercise.tip}</span><div className="df-exercise-meta"><em>{exercise.sets}</em><em>{exercise.prescription}</em><em>{exercise.rest}</em></div></div><span className="df-exercise-state">{checkedExercises.includes(index) ? 'Done' : 'Ready'}</span></article>)}</div>
            <section className="df-session-footer"><div className="df-session-fields"><label>Minutes completed<input type="number" min="1" max="300" value={sessionMinutes} onChange={e => setSessionMinutes(e.target.value)}/></label><label>Session note (optional)<input maxLength="240" value={sessionNote} onChange={e => setSessionNote(e.target.value)} placeholder="Energy, how it felt…"/></label></div><div className="df-session-summary"><span>{checkedExercises.length} of {routine.exercises.length} exercises checked</span><div className="df-mini-progress"><i style={{ width: checkedExercises.length / routine.exercises.length * 100 + '%' }}/></div></div><button type="button" className="df-primary-button df-complete-button" onClick={completeWorkout}><CheckCircle2 size={17}/> Log completed workout</button></section>
            <p className="df-disclaimer">Warm up first. Stop if you feel sharp pain, dizziness, chest pain, or unusual shortness of breath. Get professional guidance if you have an injury or medical concern.</p>
          </>}

          {!showSetup && tab === 'progress' && <>
            <div className="df-section-heading"><div><h2>Body and progress tracker</h2><p>Measurements are optional. You decide what to record.</p></div><button type="button" className="df-ghost-button" onClick={() => setShowSetup(true)}><Settings2 size={15}/> Profile</button></div>
            <div className="df-progress-stats"><article className="df-stat-card"><span className="df-stat-label">First weigh-in</span><strong>{firstWeight ? showWeight(firstWeight.kg, unit) : '—'}<small> {firstWeight ? unit : ''}</small></strong><span className="df-stat-foot">{firstWeight ? dateLabel(firstWeight.date) : 'No entry yet'}</span></article><article className="df-stat-card"><span className="df-stat-label">Latest weigh-in</span><strong>{latestWeight ? showWeight(latestWeight.kg, unit) : '—'}<small> {latestWeight ? unit : ''}</small></strong><span className="df-stat-foot">{latestWeight ? dateLabel(latestWeight.date) : 'No entry yet'}</span></article><article className="df-stat-card"><span className="df-stat-label">Change since first</span><strong>{changeKg === null ? '—' : (changeKg > 0 ? '+' : '') + showWeight(changeKg, unit)}<small> {changeKg === null ? '' : unit}</small></strong><span className="df-stat-foot">{changeKg === null ? 'Add another weigh-in' : 'A trend, not a verdict'}</span></article></div>
            <section className="df-panel"><div className="df-panel-head"><div><b>Weight history</b><small>Log whenever it is useful; daily weigh-ins are optional.</small></div><span className="df-panel-badge"><Scale size={14}/> {data.weightLogs.length} entries</span></div><TrendChart logs={data.weightLogs} unit={unit}/><form className="df-inline-form df-weight-form" onSubmit={addWeight}><label>Weight ({unit})<input type="number" min="1" max="700" step="0.1" value={weightValue} onChange={e => setWeightValue(e.target.value)} placeholder="e.g. 72.5" required/></label><label>Date<input type="date" value={weightDate} max={today()} onChange={e => setWeightDate(e.target.value)} required/></label><label className="df-wide-field">Note (optional)<input maxLength="120" value={weightNote} onChange={e => setWeightNote(e.target.value)} placeholder="Optional context"/></label><button type="submit" className="df-primary-button"><Plus size={16}/> Add weigh-in</button></form>
              {sortedWeights.length ? <div className="df-history-list">{[...sortedWeights].reverse().map(entry => <div className="df-history-row" key={entry.id}><span className="df-history-icon"><Scale size={15}/></span><span className="df-history-copy"><b>{showWeight(entry.kg, unit)} {unit}</b><small>{dateLabel(entry.date)}{entry.note ? ' · ' + entry.note : ''}</small></span><button type="button" title="Delete entry" onClick={() => removeWeight(entry.id)}><X size={15}/></button></div>)}</div> : <div className="df-empty-state"><Scale size={25}/><b>No weigh-ins yet</b><span>Add your first entry above. Progress can be much more than weight.</span></div>}
            </section>
            <section className="df-panel"><div className="df-panel-head"><div><b>Body measurements</b><small>Use one consistent method and unit; comparison is optional.</small></div><span className="df-panel-badge"><Ruler size={14}/> Optional</span></div><form className="df-inline-form" onSubmit={addMeasurements}><label>Date<input type="date" max={today()} value={measurementDraft.date} onChange={e => setMeasurementDraft(p => ({ ...p, date: e.target.value }))}/></label><label>Waist (cm)<input type="number" min="1" max="300" step="0.1" value={measurementDraft.waist} onChange={e => setMeasurementDraft(p => ({ ...p, waist: e.target.value }))} placeholder="Optional"/></label><label>Hips (cm)<input type="number" min="1" max="300" step="0.1" value={measurementDraft.hips} onChange={e => setMeasurementDraft(p => ({ ...p, hips: e.target.value }))} placeholder="Optional"/></label><label>Chest (cm)<input type="number" min="1" max="300" step="0.1" value={measurementDraft.chest} onChange={e => setMeasurementDraft(p => ({ ...p, chest: e.target.value }))} placeholder="Optional"/></label><label className="df-wide-field">Note<input maxLength="120" value={measurementDraft.notes} onChange={e => setMeasurementDraft(p => ({ ...p, notes: e.target.value }))} placeholder="Optional"/></label><button type="submit" className="df-primary-button"><Plus size={16}/> Save measurements</button></form>
              {data.measurements.length ? <div className="df-measurement-grid">{[...data.measurements].sort((a,b) => b.date.localeCompare(a.date)).map(entry => <article key={entry.id} className="df-measurement-card"><div><CalendarDays size={14}/><b>{dateLabel(entry.date)}</b></div><span>Waist <strong>{entry.waist ? entry.waist + ' cm' : '—'}</strong></span><span>Hips <strong>{entry.hips ? entry.hips + ' cm' : '—'}</strong></span><span>Chest <strong>{entry.chest ? entry.chest + ' cm' : '—'}</strong></span>{entry.notes && <small>{entry.notes}</small>}</article>)}</div> : <div className="df-empty-state compact"><Ruler size={22}/><span>No measurements saved. Totally optional.</span></div>}
            </section>
          </>}

          {!showSetup && tab === 'history' && <>
            <div className="df-section-heading"><div><h2>Training history</h2><p>Every logged session is a win — even the short ones.</p></div><span className="df-history-total">{data.workouts.length} sessions</span></div>
            {data.workouts.length ? <div className="df-workout-history">{[...data.workouts].sort((a,b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).map(item => <article key={item.id} className="df-workout-history-card"><div className="df-plan-row-art"><CheckCircle2 size={21}/></div><div className="df-plan-row-copy"><b>{item.title}</b><span>{dateLabel(item.date)} · {item.minutes} min · {item.exercises.length} exercises</span>{item.note && <small>{item.note}</small>}</div><button type="button" className="df-delete-workout" onClick={() => setData(old => ({ ...old, workouts: old.workouts.filter(workout => workout.id !== item.id) }))} aria-label="Delete workout log"><X size={16}/></button></article>)}</div> : <div className="df-empty-state large"><Trophy size={30}/><b>Your story starts with one session.</b><span>Finish a workout and it will show up here, along with your consistency stats.</span><button type="button" className="df-primary-button" onClick={() => setTab('workout')}>Start your first workout</button></div>}
          </>}
          {notice && <div className="df-toast" role="status"><CheckCircle2 size={16}/><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><X size={14}/></button></div>}
        </div>
        <footer className="df-footer"><span><HeartPulse size={13}/> Train for how you feel, not just a number.</span><span>deffitness · free for everyone</span></footer>
      </main>
    </section>
  </div>;
}
