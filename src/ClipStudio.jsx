import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Upload, Link2, Sparkles, Scissors, Captions, Download, ExternalLink, Film, LoaderCircle, Play, X, Clock3, AlertCircle, CheckCircle2, Settings2 } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jklhnhnxyzqjvmqgfpjs.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MMXxKZkJT0H7-oayT60ddA_8nC0kFjn';
const CLIP_FUNCTION_URL = SUPABASE_URL + '/functions/v1/clip-studio';
const formatTime = value => {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
};
const parseTime = value => {
  const parts = String(value || '0').split(':').map(Number);
  return parts.length === 2 ? parts[0] * 60 + parts[1] : Number(value) || 0;
};
const getSource = value => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) return 'YouTube';
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return 'Vimeo';
    if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) return 'Twitch';
    return null;
  } catch { return null; }
};

export default function ClipStudio({ onClose, db: supabase }) {
  const [mode, setMode] = useState('link');
  const [sourceUrl, setSourceUrl] = useState('');
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [clips, setClips] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clipLength, setClipLength] = useState('30');
  const [clipCount, setClipCount] = useState('5');
  const [captionStyle, setCaptionStyle] = useState('bold');
  const [aspect, setAspect] = useState('9:16');
  const [activeClip, setActiveClip] = useState(null);
  const fileInput = useRef(null);
  const videoRef = useRef(null);
  const source = useMemo(() => getSource(sourceUrl.trim()), [sourceUrl]);

  useEffect(() => {
    if (!file) { setVideoUrl(''); setDuration(0); return; }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setClips([]);
    setActiveClip(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onVideoReady() {
    const length = Number(videoRef.current?.duration);
    if (Number.isFinite(length) && length > 0) setDuration(length);
  }

  function resetResults() {
    setClips([]);
    setActiveClip(null);
    setError('');
    setNotice('');
  }

  async function analyze() {
    setError(''); setNotice(''); setClips([]); setActiveClip(null);
    if (mode === 'link' && !source) { setError('Paste a valid YouTube, Vimeo, or Twitch URL first.'); return; }
    if (mode === 'upload' && !file) { setError('Choose a video file from your device first.'); return; }
    if (mode === 'upload' && file.size > 1024 * 1024 * 1024) { setError('This upload is larger than 1 GB. Choose a smaller video for now.'); return; }
    setBusy(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (sessionError || !session?.access_token || !session.user?.id) throw new Error('Sign in to defchat first. Clip Studio uses your Supabase account to protect your videos.');
      const requestBody = {
        sourceType: mode === 'link' ? 'url' : 'upload',
        url: mode === 'link' ? sourceUrl.trim() : undefined,
        clipLength: Number(clipLength), clipCount: Number(clipCount),
        aspectRatio: aspect, captionStyle: captionStyle === 'boxed' ? 'bold' : captionStyle
      };
      if (mode === 'upload') {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'video.mp4';
        const sourcePath = session.user.id + '/' + crypto.randomUUID() + '-' + safeName;
        const { error: uploadError } = await supabase.storage.from('clip-studio').upload(sourcePath, file, {
          contentType: file.type || 'video/mp4', cacheControl: '3600', upsert: false
        });
        if (uploadError) throw new Error('Could not upload your video to Supabase Storage: ' + uploadError.message);
        requestBody.sourcePath = sourcePath;
      }
      let processorSource = requestBody.url || '';
      if (mode === 'upload') {
        const { data: signedData, error: signedError } = await supabase.storage.from('clip-studio').createSignedUrl(requestBody.sourcePath, 60 * 60);
        if (signedError || !signedData?.signedUrl) throw new Error('Could not create a temporary link for your uploaded video: ' + (signedError?.message || 'No signed URL returned.'));
        processorSource = signedData.signedUrl;
      }
      const { data: createdJob, error: createJobError } = await supabase.from('clip_jobs').insert({
        user_id: session.user.id, status: 'processing', source_type: requestBody.sourceType,
        source_url: mode === 'link' ? requestBody.url : null,
        source_path: mode === 'upload' ? requestBody.sourcePath : null,
        clip_length: Number(clipLength), clip_count: Number(clipCount),
        aspect_ratio: aspect, caption_style: requestBody.captionStyle
      }).select('id').single();
      if (createJobError || !createdJob?.id) throw new Error('Could not create your clip job: ' + (createJobError?.message || 'No job ID returned.'));
      let response;
      try {
        response = await fetch('http://localhost:8765/process-local', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: createdJob.id, userId: session.user.id, sourceType: requestBody.sourceType,
            sourceUrl: processorSource, clipLength: Number(clipLength), clipCount: Number(clipCount),
            aspectRatio: aspect, captionStyle: requestBody.captionStyle,
            output: { bucket: 'clip-studio', prefix: session.user.id + '/' + createdJob.id + '/' }
          })
        });
      } catch {
        await supabase.from('clip_jobs').update({ status: 'failed', error_message: 'Local processor is not running.' }).eq('id', createdJob.id);
        throw new Error('The free local processor is not running. Start clip-processor/start-windows.bat, then retry.');
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || payload.error || 'The local clip processor could not accept this video.');
      let results = Array.isArray(payload.clips) ? payload.clips : Array.isArray(payload.results) ? payload.results : [];
      if (!results.length && payload.jobId) {
        setNotice('Your video is queued. AI is transcribing, finding highlights, adding captions, and rendering MP4 clips…');
        const deadline = Date.now() + 15 * 60 * 1000;
        while (Date.now() < deadline) {
          await new Promise(resolve => window.setTimeout(resolve, 5000));
          const { data: job, error: jobError } = await supabase.from('clip_jobs')
            .select('status, clips, error_message')
            .eq('id', payload.jobId)
            .maybeSingle();
          if (jobError) throw new Error('The processor is running, but the job status could not be read: ' + jobError.message);
          if (job?.status === 'completed' && Array.isArray(job.clips) && job.clips.length) { results = job.clips; break; }
          if (job?.status === 'failed') throw new Error(job.error_message || 'The video processor could not finish this job.');
          setNotice('AI processing is still running… This can take several minutes for a long video.');
        }
      }
      if (!results.length) { setNotice('Your clip job is still processing. Keep this window open and try again shortly if it takes longer than 15 minutes.'); return; }
      setClips(results.map((clip, index) => ({
        id: clip.id || 'clip-' + index, title: clip.title || clip.caption || 'Highlight ' + (index + 1),
        start: Number(clip.start ?? clip.startSeconds ?? 0), end: Number(clip.end ?? clip.endSeconds ?? 0),
        caption: clip.captionText || clip.caption || '', videoUrl: clip.videoUrl || clip.video_url || '',
        downloadUrl: clip.downloadUrl || clip.download_url || '', thumbnailUrl: clip.thumbnailUrl || clip.thumbnail_url || ''
      })));
      setNotice('Highlights are ready. Preview each clip or download the rendered file.');
    } catch (e) { setError(e.message || 'Could not analyze this video. Please try again.'); }
    finally { setBusy(false); }
  }

  function seekTo(clip) {
    setActiveClip(clip.id);
    if (videoRef.current && videoUrl) {
      videoRef.current.currentTime = Math.max(0, clip.start);
      videoRef.current.play().catch(() => {});
    } else if (clip.videoUrl) {
      window.open(clip.videoUrl, '_blank', 'noopener,noreferrer');
    } else if (clip.downloadUrl) {
      window.open(clip.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  }

  async function downloadAll() {
    const urls = clips.map(clip => clip.downloadUrl || clip.videoUrl).filter(Boolean);
    if (!urls.length) { setError('The clip service has not provided rendered download files yet.'); return; }
    urls.forEach((url, index) => window.setTimeout(() => {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'defchat-clip-' + (index + 1) + '.mp4';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }, index * 250));
  }

  const styles = `
    .clip-studio-overlay{position:fixed;inset:0;z-index:1200;background:#0b0b0e;color:#f8fafc;overflow:auto;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    .clip-studio-shell{max-width:1240px;margin:0 auto;padding:26px clamp(16px,3vw,40px) 48px}
    .clip-studio-top{display:flex;align-items:center;gap:14px;margin-bottom:34px}
    .clip-studio-back{width:42px;height:42px;border:1px solid #303039;background:#17171e;color:#eee;border-radius:13px;display:grid;place-items:center;cursor:pointer}
    .clip-studio-brand{display:flex;align-items:center;gap:11px}.clip-studio-brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#ffd54a,#f59e0b);color:#17120a}
    .clip-studio-brand b{font-size:15px;letter-spacing:.01em}.clip-studio-brand small{display:block;color:#9b9ba9;font-size:11px;margin-top:3px}
    .clip-studio-top-spacer{flex:1}.clip-studio-status{border:1px solid #2b4537;color:#9be4b9;background:#10241b;border-radius:99px;padding:7px 11px;font-size:11px;display:flex;gap:7px;align-items:center}
    .clip-studio-status i{width:6px;height:6px;background:#4ade80;border-radius:50%}
    .clip-studio-hero{text-align:center;max-width:800px;margin:0 auto 34px}.clip-studio-eyebrow{font-size:11px;font-weight:800;letter-spacing:.17em;color:#fbbf24;text-transform:uppercase;display:inline-flex;align-items:center;gap:8px}
    .clip-studio-hero h1{font-size:clamp(34px,5vw,58px);letter-spacing:-.055em;line-height:1.05;margin:15px 0 15px;font-weight:800}.clip-studio-hero h1 span{color:#fbbf24}
    .clip-studio-hero p{font-size:15px;line-height:1.75;color:#a8a8b6;max-width:660px;margin:0 auto}
    .clip-studio-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:28px 0 32px}
    .clip-studio-step{border:1px solid #292932;background:#121218;border-radius:15px;padding:16px;min-height:118px}.clip-studio-step-num{font-size:10px;font-weight:800;color:#fbbf24;letter-spacing:.12em}.clip-studio-step h3{font-size:13px;margin:11px 0 7px}.clip-studio-step p{font-size:11px;line-height:1.55;color:#9696a5;margin:0}
    .clip-studio-main{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(290px,.75fr);gap:18px;align-items:start}
    .clip-studio-panel{background:#131319;border:1px solid #2b2b35;border-radius:20px;padding:22px;min-width:0}
    .clip-studio-panel-head{display:flex;align-items:center;gap:11px;margin-bottom:18px}.clip-studio-panel-icon{width:38px;height:38px;border-radius:12px;background:#27220f;color:#fbbf24;display:grid;place-items:center}.clip-studio-panel-head h2{font-size:16px;margin:0}.clip-studio-panel-head p{font-size:12px;color:#9999a8;margin:5px 0 0}
    .clip-studio-tabs{display:flex;background:#0b0b10;border:1px solid #292932;border-radius:12px;padding:4px;gap:4px;margin-bottom:16px}.clip-studio-tabs button{flex:1;border:0;background:transparent;color:#a7a7b5;padding:10px;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700}.clip-studio-tabs button.active{background:#2a2411;color:#ffcf40}
    .clip-studio-field-label{display:block;color:#c8c8d2;font-size:12px;font-weight:700;margin:0 0 8px}.clip-studio-url-row{display:flex;gap:8px}.clip-studio-input{width:100%;min-width:0;background:#0b0b10;color:#f8fafc;border:1px solid #373742;border-radius:11px;padding:13px 14px;outline:none;font-size:13px}.clip-studio-input:focus{border-color:#eab308;box-shadow:0 0 0 3px #eab30820}.clip-studio-primary{border:0;border-radius:11px;padding:12px 15px;background:linear-gradient(135deg,#facc15,#f59e0b);color:#1a1507;font-weight:800;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;white-space:nowrap}.clip-studio-primary:disabled{opacity:.55;cursor:wait}
    .clip-studio-hint{font-size:11px;line-height:1.55;color:#898997;margin:9px 0 16px}.clip-studio-drop{border:1px dashed #484853;border-radius:14px;background:#0d0d12;padding:28px 18px;text-align:center;cursor:pointer;display:block}.clip-studio-drop:hover{border-color:#eab308;background:#17150d}.clip-studio-drop-icon{width:48px;height:48px;display:grid;place-items:center;margin:0 auto 11px;border-radius:15px;background:#29220c;color:#facc15}.clip-studio-drop b{display:block;font-size:13px}.clip-studio-drop span{display:block;color:#9292a0;font-size:11px;margin-top:7px}.clip-studio-settings{border-top:1px solid #292932;margin-top:21px;padding-top:18px}.clip-studio-settings h3{font-size:12px;margin:0 0 13px}.clip-studio-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.clip-studio-settings label{display:block;color:#a8a8b6;font-size:11px}.clip-studio-settings select{display:block;width:100%;margin-top:7px;background:#0b0b10;color:#f5f5f7;border:1px solid #373742;border-radius:10px;padding:10px;font-size:12px}
    .clip-studio-preview{background:#09090c;border:1px solid #2b2b35;border-radius:15px;overflow:hidden}.clip-studio-preview video{display:block;width:100%;max-height:360px;aspect-ratio:16/9;object-fit:contain;background:#050506}.clip-studio-empty-preview{min-height:230px;display:grid;place-items:center;text-align:center;padding:25px;color:#888896}.clip-studio-empty-preview svg{color:#facc15;margin:0 auto 10px}.clip-studio-empty-preview b{display:block;color:#d4d4dc;font-size:13px}.clip-studio-empty-preview p{font-size:11px;line-height:1.6;max-width:260px;margin:8px auto 0}
    .clip-studio-video-meta{display:flex;justify-content:space-between;gap:8px;padding:12px 14px;color:#a4a4b2;font-size:11px}.clip-studio-pill{border:1px solid #34343f;border-radius:99px;padding:4px 8px;color:#c6c6d1}
    .clip-studio-notice{padding:12px 13px;border-radius:11px;font-size:12px;line-height:1.55;margin-top:14px}.clip-studio-error{background:#2a1718;border:1px solid #653033;color:#ffb4b4}.clip-studio-success{background:#12251b;border:1px solid #2c563b;color:#a6e8bd}
    .clip-studio-results{margin-top:22px}.clip-studio-results-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.clip-studio-results-head h2{font-size:17px;margin:0}.clip-studio-results-head p{font-size:12px;color:#9999a8;margin:5px 0 0}.clip-studio-results-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}
    .clip-studio-card{border:1px solid #30303a;background:#15151c;border-radius:15px;overflow:hidden;min-width:0}.clip-studio-card-thumb{aspect-ratio:9/12;background:#09090c;position:relative;display:grid;place-items:center;overflow:hidden}.clip-studio-card-thumb img,.clip-studio-card-thumb video{width:100%;height:100%;object-fit:cover}.clip-studio-card-thumb video{pointer-events:none}.clip-studio-card-duration{position:absolute;right:8px;bottom:8px;background:#050506d9;color:white;border-radius:6px;padding:4px 6px;font-size:10px}.clip-studio-card-body{padding:12px}.clip-studio-card-body h3{font-size:12px;line-height:1.4;margin:0 0 7px}.clip-studio-card-body p{font-size:11px;color:#9999a8;line-height:1.5;margin:0 0 12px}.clip-studio-card-actions{display:flex;gap:7px}.clip-studio-card-actions button,.clip-studio-card-actions a{display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid #393943;background:#22222b;color:#e8e8ef;border-radius:8px;padding:8px;font-size:10px;text-decoration:none;cursor:pointer;flex:1;min-width:0}.clip-studio-card-actions .clip-download{background:#facc15;color:#171307;border-color:#facc15;font-weight:800}
    .clip-studio-footer{display:flex;gap:9px;align-items:flex-start;margin-top:18px;color:#8f8f9d;font-size:11px;line-height:1.65}.clip-studio-footer svg{flex:none;color:#fbbf24;margin-top:1px}
    @media(max-width:850px){.clip-studio-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.clip-studio-main{grid-template-columns:1fr}.clip-studio-results-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.clip-studio-panel{padding:17px}}
    @media(max-width:520px){.clip-studio-shell{padding:15px 12px 30px}.clip-studio-top{margin-bottom:25px}.clip-studio-status{display:none}.clip-studio-hero{margin-bottom:22px}.clip-studio-hero p{font-size:13px}.clip-studio-steps{gap:8px;margin:22px 0}.clip-studio-step{padding:12px;min-height:110px}.clip-studio-step h3{font-size:12px}.clip-studio-step p{font-size:10px}.clip-studio-panel{padding:14px;border-radius:16px}.clip-studio-url-row{flex-direction:column}.clip-studio-url-row .clip-studio-primary{width:100%}.clip-studio-results-grid{grid-template-columns:1fr}.clip-studio-card{display:grid;grid-template-columns:110px minmax(0,1fr)}.clip-studio-card-thumb{aspect-ratio:3/4}.clip-studio-card-actions{flex-wrap:wrap}.clip-studio-card-actions button,.clip-studio-card-actions a{min-width:70px}.clip-studio-settings-grid{gap:9px}}
  `;

  return <div className="clip-studio-overlay">
    <style>{styles}</style>
    <div className="clip-studio-shell">
      <div className="clip-studio-top">
        <button className="clip-studio-back" onClick={onClose} aria-label="Back to defchat"><ArrowLeft size={18}/></button>
        <div className="clip-studio-brand"><span className="clip-studio-brand-mark"><Film size={20}/></span><div><b>AI Clip Studio</b><small>by defchat</small></div></div>
        <span className="clip-studio-top-spacer"/>
        <span className="clip-studio-status"><i/> Video workspace</span>
        <button className="clip-studio-back" onClick={onClose} aria-label="Close Clip Studio"><X size={18}/></button>
      </div>
      <section className="clip-studio-hero">
        <span className="clip-studio-eyebrow"><Sparkles size={14}/> TURN LONG VIDEOS INTO SHORTS</span>
        <h1>Make every moment <span>count.</span></h1>
        <p>Find the best moments in your videos, turn them into vertical clips, add animated captions, and get them ready for your favorite platforms.</p>
      </section>
      <section className="clip-studio-steps" aria-label="How it works">
        <article className="clip-studio-step"><span className="clip-studio-step-num">01 / SOURCE</span><h3>Paste a link or upload</h3><p>YouTube, Vimeo, Twitch, or a video file from your device.</p></article>
        <article className="clip-studio-step"><span className="clip-studio-step-num">02 / DISCOVER</span><h3>AI finds the best moments</h3><p>Transcript, audio energy, and visual cues reveal potential highlights.</p></article>
        <article className="clip-studio-step"><span className="clip-studio-step-num">03 / CREATE</span><h3>Captioned vertical clips</h3><p>9:16 reframing, animated captions, and trim controls.</p></article>
        <article className="clip-studio-step"><span className="clip-studio-step-num">04 / EXPORT</span><h3>Download or post</h3><p>Export clips individually or in a batch for social platforms.</p></article>
      </section>

      <div className="clip-studio-main">
        <section className="clip-studio-panel">
          <div className="clip-studio-panel-head"><span className="clip-studio-panel-icon"><Scissors size={18}/></span><div><h2>Start a new project</h2><p>Choose your source, then tune your clips.</p></div></div>
          <div className="clip-studio-tabs" role="tablist" aria-label="Video source">
            <button type="button" role="tab" aria-selected={mode === 'link'} className={mode === 'link' ? 'active' : ''} onClick={() => {setMode('link');resetResults()}}><Link2 size={14} style={{verticalAlign:'-3px',marginRight:6}}/>Paste a link</button>
            <button type="button" role="tab" aria-selected={mode === 'upload'} className={mode === 'upload' ? 'active' : ''} onClick={() => {setMode('upload');resetResults()}}><Upload size={14} style={{verticalAlign:'-3px',marginRight:6}}/>Upload video</button>
          </div>
          {mode === 'link' ? <>
            <label className="clip-studio-field-label" htmlFor="clip-source-url">Video URL</label>
            <div className="clip-studio-url-row"><input id="clip-source-url" className="clip-studio-input" type="url" value={sourceUrl} onChange={event => {setSourceUrl(event.target.value);resetResults()}} placeholder="Paste a YouTube, Vimeo, or Twitch link…"/><button className="clip-studio-primary" type="button" onClick={analyze} disabled={busy}>{busy ? <LoaderCircle size={16} className="spin"/> : <Sparkles size={16}/>} Find clips</button></div>
            <p className="clip-studio-hint">{source ? <><CheckCircle2 size={12} style={{verticalAlign:'-2px',marginRight:5,color:'#86efac'}}/>{source} link recognized.</> : 'Paste a public video link. Processing depends on the connected clip service and the source platform’s access rules.'}</p>
          </> : <>
            <label className="clip-studio-field-label">Video file</label>
            <input ref={fileInput} type="file" accept="video/*,.mp4,.mov,.webm,.m4v" hidden onChange={event => {setFile(event.target.files?.[0] || null);resetResults()}}/>
            <button type="button" className="clip-studio-drop" onClick={() => fileInput.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => {event.preventDefault();const dropped=event.dataTransfer.files?.[0];if(dropped&&dropped.type.startsWith('video/')){setFile(dropped);resetResults()}else setError('Drop a supported video file.')}}>
              <span className="clip-studio-drop-icon"><Upload size={22}/></span><b>{file ? file.name : 'Choose a video or drag it here'}</b><span>{file ? ((file.size / 1024 / 1024).toFixed(1) + ' MB · local preview ready') : 'MP4, MOV, WebM and other browser-supported video formats'}</span>
            </button>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:13}}><button className="clip-studio-primary" type="button" onClick={analyze} disabled={busy || !file}>{busy ? <LoaderCircle size={16} className="spin"/> : <Sparkles size={16}/>} Analyze and find clips</button></div>
          </>}
          <div className="clip-studio-settings">
            <h3><Settings2 size={14} style={{verticalAlign:'-3px',marginRight:6}}/> Clip settings</h3>
            <div className="clip-studio-settings-grid">
              <label>Target clip length<select value={clipLength} onChange={event => setClipLength(event.target.value)}><option value="15">15 seconds</option><option value="30">30 seconds</option><option value="45">45 seconds</option><option value="60">60 seconds</option><option value="90">90 seconds</option></select></label>
              <label>Number of clips<select value={clipCount} onChange={event => setClipCount(event.target.value)}><option value="3">3 highlights</option><option value="5">5 highlights</option><option value="10">10 highlights</option><option value="15">15 highlights</option></select></label>
              <label>Clip format<select value={aspect} onChange={event => setAspect(event.target.value)}><option value="9:16">Vertical · 9:16</option><option value="1:1">Square · 1:1</option><option value="16:9">Landscape · 16:9</option></select></label>
              <label>Caption style<select value={captionStyle} onChange={event => setCaptionStyle(event.target.value)}><option value="bold">Animated bold</option><option value="karaoke">Karaoke highlight</option><option value="minimal">Minimal clean</option><option value="boxed">High contrast box</option></select></label>
            </div>
          </div>
          {error && <div className="clip-studio-notice clip-studio-error" role="alert"><AlertCircle size={15} style={{verticalAlign:'-3px',marginRight:7}}/>{error}</div>}
          {notice && <div className="clip-studio-notice clip-studio-success" role="status"><CheckCircle2 size={15} style={{verticalAlign:'-3px',marginRight:7}}/>{notice}</div>}
          <div className="clip-studio-footer"><AlertCircle size={15}/><span>AI analysis, rendered captions, and final MP4 exports require a configured processing backend. This interface will not label timestamp suggestions as finished clips.</span></div>
        </section>

        <section className="clip-studio-panel">
          <div className="clip-studio-panel-head"><span className="clip-studio-panel-icon"><Play size={18}/></span><div><h2>Source preview</h2><p>{file ? 'Local file preview' : source ? source + ' source link' : 'Your video appears here'}</p></div></div>
          <div className="clip-studio-preview">
            {videoUrl ? <video ref={videoRef} src={videoUrl} controls playsInline onLoadedMetadata={onVideoReady} /> : <div className="clip-studio-empty-preview"><Film size={30}/><div><b>Ready for your next highlight</b><p>Upload a video to preview it in the workspace. For remote links, the connected clip backend handles source access.</p></div></div>}
            <div className="clip-studio-video-meta"><span>{file ? file.name : source || 'No source selected'}</span><span className="clip-studio-pill">{duration ? formatTime(duration) : 'No duration'}</span></div>
          </div>
          {sourceUrl && source && <div style={{marginTop:12,fontSize:11,color:'#a3a3b2'}}>Source link: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{color:'#facc15',wordBreak:'break-all'}}><ExternalLink size={11} style={{verticalAlign:'-2px',marginRight:4}}/>Open original video</a></div>}
        </section>
      </div>

      {clips.length > 0 && <section className="clip-studio-results">
        <div className="clip-studio-results-head"><div><h2>Your highlights</h2><p>{clips.length} clip{clips.length === 1 ? '' : 's'} returned by the processing service.</p></div><button className="clip-studio-primary" type="button" onClick={downloadAll}><Download size={15}/> Download all</button></div>
        <div className="clip-studio-results-grid">{clips.map((clip,index) => <article className="clip-studio-card" key={clip.id}>
          <div className="clip-studio-card-thumb">{clip.thumbnailUrl ? <img src={clip.thumbnailUrl} alt=""/> : clip.videoUrl ? <video src={clip.videoUrl} muted playsInline preload="metadata"/> : <Film size={28} color="#facc15"/>}<span className="clip-studio-card-duration">{formatTime(clip.end - clip.start)}</span></div>
          <div className="clip-studio-card-body"><h3>{clip.title || 'Highlight ' + (index + 1)}</h3><p>{formatTime(clip.start)}–{formatTime(clip.end)}{clip.caption ? ' · ' + clip.caption : ''}</p><div className="clip-studio-card-actions"><button type="button" onClick={() => seekTo(clip)}><Play size={12}/> Preview</button>{(clip.downloadUrl || clip.videoUrl) ? <a className="clip-download" href={clip.downloadUrl || clip.videoUrl} download={'defchat-clip-' + (index + 1) + '.mp4'} target="_blank" rel="noopener noreferrer"><Download size={12}/> Download</a> : <button type="button" disabled title="The backend has not returned a rendered clip">Export pending</button>}</div></div>
        </article>)}</div>
      </section>}
      <div className="clip-studio-footer"><Captions size={15}/><span>Posting directly to TikTok, YouTube Shorts, Instagram Reels, or LinkedIn requires the relevant platform API, account authorization, and permissions. Downloading your clips remains the basic export path.</span></div>
    </div>
  </div>;
}
