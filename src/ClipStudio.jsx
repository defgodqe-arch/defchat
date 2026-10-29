import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { ArrowLeft, Upload, Link2, Sparkles, Scissors, Captions, Download, ExternalLink, Film, LoaderCircle, Play, X, Clock3, AlertCircle, CheckCircle2, Settings2, Youtube, LogOut } from 'lucide-react';

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

const getYouTubeId = value => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
      return match?.[1] || null;
    }
    return null;
  } catch { return null; }
};

const getSource = value => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) return 'YouTube';
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return 'Vimeo';
    if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) return 'Twitch';
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'TikTok';
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'Instagram';
    if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch') return 'Facebook';
    return null;
  } catch { return null; }
};

export default function ClipStudio({ onClose, db: supabase }) {
  const [mode, setMode] = useState('link');
  const [sourceUrl, setSourceUrl] = useState('');
  const [authorizedSource, setAuthorizedSource] = useState(false);
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [clips, setClips] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clipLength, setClipLength] = useState('30');
  const [clipCount, setClipCount] = useState('5');
  const [captionStyle, setCaptionStyle] = useState('bold');
  const [aspect, setAspect] = useState('9:16');
  const [activeClip, setActiveClip] = useState(null);
  const [youtubeToken, setYoutubeToken] = useState('');
  const [youtubeChannel, setYoutubeChannel] = useState(null);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const fileInput = useRef(null);
  const videoRef = useRef(null);
  const source = useMemo(() => getSource(sourceUrl.trim()), [sourceUrl]);
  const youtubeId = useMemo(() => getYouTubeId(sourceUrl.trim()), [sourceUrl]);

  useEffect(() => {
    if (!supabase?.auth?.getSession) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data?.session?.provider_token) setYoutubeToken(data.session.provider_token);
    }).catch(() => {});
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive && session?.provider_token) setYoutubeToken(session.provider_token);
    });
    return () => { alive = false; listener?.subscription?.unsubscribe?.(); };
  }, [supabase]);

  useEffect(() => {
    if (!youtubeToken) { setYoutubeChannel(null); setYoutubeVideos([]); return; }
    let cancelled = false;
    async function loadLibrary() {
      setYoutubeLoading(true); setYoutubeError('');
      try {
        const headers = { Authorization: 'Bearer ' + youtubeToken };
        const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true', { headers });
        const channelData = await channelResponse.json();
        if (!channelResponse.ok) throw new Error(channelData.error?.message || 'Could not read your YouTube channel.');
        const channel = channelData.items?.[0];
        if (!channel) throw new Error('No YouTube channel was found for this Google account.');
        const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;
        if (!playlistId) throw new Error('Your channel does not expose an uploads playlist.');
        const videosResponse = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=25&playlistId=' + encodeURIComponent(playlistId), { headers });
        const videosData = await videosResponse.json();
        if (!videosResponse.ok) throw new Error(videosData.error?.message || 'Could not load your uploaded videos.');
        if (!cancelled) { setYoutubeChannel(channel.snippet); setYoutubeVideos(videosData.items || []); }
      } catch (error) {
        if (!cancelled) setYoutubeError(error?.message || 'Could not load YouTube videos.');
      } finally { if (!cancelled) setYoutubeLoading(false); }
    }
    loadLibrary();
    return () => { cancelled = true; };
  }, [youtubeToken]);

  async function connectYouTube() {
    setYoutubeError('');
    if (!supabase?.auth?.linkIdentity) { setYoutubeError('Secure Google account linking is unavailable in this session.'); return; }
    const { error: oauthError } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        scopes: 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
        redirectTo: window.location.href,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
    if (oauthError) setYoutubeError(oauthError.message || 'Could not connect YouTube.');
  }

  async function disconnectYouTube() {
    setYoutubeToken('');
    setYoutubeChannel(null);
    setYoutubeVideos([]);
    setYoutubeError('');
    // Supabase's Google provider token is part of its auth session; signing out here
    // would also sign the user out of defchat, so simply clear the Clip Studio connection.
  }

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
    clips.forEach(clip => { if (clip.videoUrl && clip.videoUrl.startsWith('blob:')) URL.revokeObjectURL(clip.videoUrl); });
    setClips([]);
    setActiveClip(null);
    setError('');
    setNotice('');
  }

  async function analyze() {
    setError(''); setNotice(''); setClips([]); setActiveClip(null); setProgress(0);
    let inputFile = file;
    let inputDuration = duration;
    if (mode === 'link') {
      if (!sourceUrl.trim()) { setError('Paste a video URL first.'); return; }
      let parsed;
      try { parsed = new URL(sourceUrl.trim()); } catch { setError('Enter a valid https:// video URL.'); return; }
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') { setError('For safety, video URLs must use HTTPS.'); return; }
      // Platform pages (YouTube/Vimeo/Twitch) cannot be fetched as media files
      // in the browser. Send them to the authenticated server-side processor.
      if (source) {
        if (!authorizedSource) { setError('Confirm that you own this video or have permission to download and process it.'); return; }
        if (!supabase?.auth?.getSession) {
          setError('Your signed-in Supabase session is unavailable. Sign out and back in, then retry.');
          return;
        }
        setBusy(true);
        setNotice('Sending the video link to defchat’s secure clip processor…');
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          if (sessionError || !accessToken) throw new Error('Your session has expired. Sign in again and retry.');
          const response = await fetch(CLIP_FUNCTION_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + accessToken,
              'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({
              sourceType: 'url',
              url: sourceUrl.trim(),
              clipLength: Number(clipLength),
              clipCount: Number(clipCount),
              aspectRatio: aspect,
              captionStyle
            })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || ('Clip processor returned HTTP ' + response.status + '.'));
          const serverClips = Array.isArray(result.clips) ? result.clips : [];
          const normalized = serverClips.map((clip, index) => ({
            id: clip.id || clip.path || ('server-clip-' + index),
            title: clip.title || ('Clip ' + (index + 1)),
            start: Number(clip.start || 0),
            end: Number(clip.end || 0),
            caption: clip.caption || '',
            videoUrl: clip.videoUrl || clip.video_url || clip.url || clip.downloadUrl || clip.download_url || '',
            downloadUrl: clip.downloadUrl || clip.download_url || clip.videoUrl || clip.video_url || clip.url || '',
            thumbnailUrl: clip.thumbnailUrl || clip.thumbnail_url || ''
          }));
          setClips(normalized);
          if (result.status === 'processing' || response.status === 202) {
            setNotice(result.message || 'Your video was accepted and is processing. Refresh the clip list in a moment to see the finished MP4s.');
          } else if (normalized.length) {
            setNotice('Finished! ' + normalized.length + ' rendered clips are ready.');
          } else {
            setNotice(result.message || 'The processor accepted the request but has not returned finished clips yet.');
          }
        } catch (e) {
          setError((e?.message || 'Could not submit this video to the clip processor.') + ' You can still upload a video file to render clips locally.');
        } finally {
          setBusy(false);
        }
        return;
      }
    } else if (!inputFile) { setError('Choose a video file from your device first.'); return; }
    if (inputFile && inputFile.size > 500 * 1024 * 1024) { setError('Choose a video smaller than 500 MB for browser-based processing.'); return; }
    setBusy(true);
    let ffmpeg;
    try {
      if (mode === 'link') {
        setNotice('Fetching the video URL into your browser…');
        let response;
        try { response = await fetch(sourceUrl.trim(), { mode: 'cors', credentials: 'omit' }); }
        catch { throw new Error('This website blocks browser access to the video (CORS). Use a direct .mp4/.mov/.webm file URL from a host that allows cross-origin downloads, or upload the file. YouTube/Vimeo/Twitch page links are not direct video files.'); }
        if (!response.ok) throw new Error('The video host returned HTTP ' + response.status + '. Check that the URL is public and points directly to a video file.');
        const type = (response.headers.get('content-type') || '').toLowerCase();
        if (!type.startsWith('video/') && !/\.mp4|\.mov|\.webm|\.m4v|\.mkv|\.mpeg|\.mpg/i.test(new URL(sourceUrl.trim()).pathname)) throw new Error('That URL does not appear to point directly to a video file. Paste a direct MP4, MOV, or WebM URL rather than a webpage link.');
        const blob = await response.blob();
        if (!blob.size) throw new Error('The video URL returned an empty file.');
        if (blob.size > 500 * 1024 * 1024) throw new Error('This video is larger than the 500 MB browser-processing limit.');
        inputFile = new File([blob], (new URL(sourceUrl.trim()).pathname.split('/').pop() || 'remote-video.mp4').split('?')[0], { type: blob.type || 'video/mp4' });
        const metadataUrl = URL.createObjectURL(inputFile);
        inputDuration = await new Promise((resolve, reject) => {
          const probe = document.createElement('video');
          probe.preload = 'metadata';
          probe.onloadedmetadata = () => { const d = probe.duration; URL.revokeObjectURL(metadataUrl); resolve(Number.isFinite(d) ? d : 0); };
          probe.onerror = () => { URL.revokeObjectURL(metadataUrl); reject(new Error('The browser could not read this video format.')); };
          probe.src = metadataUrl;
        });
      }
      if (!inputFile) throw new Error('Choose a video file or paste a direct video file URL.');
      if (!Number.isFinite(inputDuration) || inputDuration < 1) throw new Error('Could not read the video duration. Try an MP4 with H.264 video and AAC audio.');
      setNotice('Loading the free video engine into your browser. The first load may take a minute…');
      ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress: value }) => { const percent = Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100))); setProgress(percent); setNotice('Rendering clips in your browser… ' + percent + '%'); });
      const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
      await ffmpeg.load({ coreURL: await toBlobURL(base + '/ffmpeg-core.js', 'text/javascript'), wasmURL: await toBlobURL(base + '/ffmpeg-core.wasm', 'application/wasm') });
      setNotice('Preparing your video in this browser…');
      const extMatch = inputFile.name.match(/\.[a-zA-Z0-9]{1,8}$/);
      const inputName = 'defchat-input-' + Date.now() + (extMatch ? extMatch[0] : '.mp4');
      await ffmpeg.writeFile(inputName, new Uint8Array(await inputFile.arrayBuffer()));
      const seconds = Number(clipLength);
      const count = Math.min(Number(clipCount), Math.max(1, Math.ceil(inputDuration / seconds)));
      const maxStart = Math.max(0, inputDuration - seconds);
      const starts = count === 1 ? [0] : Array.from({ length: count }, (_, i) => Math.round((maxStart * i / (count - 1)) * 100) / 100);
      const dims = aspect === '9:16' ? [720, 1280] : aspect === '1:1' ? [720, 720] : [1280, 720];
      const generated = [];
      for (let i = 0; i < starts.length; i++) {
        const outputName = 'defchat-clip-' + (i + 1) + '-' + Date.now() + '.mp4';
        const startAt = starts[i];
        const actualLength = Math.max(1, Math.min(seconds, inputDuration - startAt));
        const filter = 'scale=' + dims[0] + ':' + dims[1] + ':force_original_aspect_ratio=increase,crop=' + dims[0] + ':' + dims[1];
        setNotice('Rendering clip ' + (i + 1) + ' of ' + starts.length + ' in your browser…');
        const exitCode = await ffmpeg.exec(['-ss', String(startAt), '-i', inputName, '-t', String(actualLength), '-vf', filter, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '27', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', outputName]);
        if (exitCode !== 0) throw new Error('FFmpeg could not render this clip. Try an MP4 with H.264 video and AAC audio.');
        const data = await ffmpeg.readFile(outputName);
        if (!data || !data.length) throw new Error('The browser video engine returned an empty clip. Try a shorter MP4.');
        const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
        generated.push({ id: outputName, title: 'Clip ' + (i + 1), start: startAt, end: startAt + actualLength, caption: '', videoUrl: url, downloadUrl: url, thumbnailUrl: '' });
        await ffmpeg.deleteFile(outputName).catch(() => {});
        setProgress(Math.round(((i + 1) / starts.length) * 100));
      }
      await ffmpeg.deleteFile(inputName).catch(() => {});
      setClips(generated);
      setNotice('Finished! ' + generated.length + ' MP4 clips were rendered locally in your browser. This version creates evenly spaced clips; AI highlight detection and burned-in captions are not included yet.');
    } catch (e) { setError((e && e.message ? e.message : 'Could not process this video in your browser.') + ' Try a shorter MP4 if the browser runs out of memory.'); }
    finally { if (ffmpeg) { try { ffmpeg.terminate(); } catch {} } setBusy(false); }
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
            <div style={{border:'1px solid #34343f',background:'#0d0d12',borderRadius:13,padding:14,marginBottom:17}}>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <span style={{width:34,height:34,borderRadius:10,display:'grid',placeItems:'center',background:'#29220c',color:'#facc15'}}><Youtube size={19}/></span>
                <div style={{flex:1,minWidth:150}}><b style={{fontSize:12}}>Your YouTube library</b><div style={{fontSize:10,color:'#9292a0',marginTop:3}}>{youtubeChannel?.title ? 'Connected to ' + youtubeChannel.title : 'Sign in to browse videos uploaded to your channel'}</div></div>
                {youtubeToken ? <button type="button" className="clip-studio-primary" onClick={disconnectYouTube}><LogOut size={14}/> Hide list</button> : <button type="button" className="clip-studio-primary" onClick={connectYouTube}><Youtube size={14}/> Connect YouTube</button>}
              </div>
              {youtubeLoading && <p className="clip-studio-hint" style={{marginBottom:0}}>Loading your channel uploads…</p>}
              {youtubeError && <p role="alert" className="clip-studio-hint" style={{color:'#fca5a5',marginBottom:0}}>{youtubeError}</p>}
              {youtubeVideos.length > 0 && <div style={{display:'grid',gap:8,marginTop:12,maxHeight:260,overflowY:'auto'}}>
                {youtubeVideos.map(item => {
                  const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
                  const title = item.snippet?.title || 'Untitled video';
                  const thumb = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
                  return <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,background:'#15151c',borderRadius:10,padding:8}}>
                    {thumb && <img src={thumb} alt="" style={{width:76,height:48,objectFit:'cover',borderRadius:6}}/>}
                    <div style={{flex:1,minWidth:0}}><b style={{display:'block',fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</b><small style={{color:'#9292a0',fontSize:10}}>{item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString() : ''}</small></div>
                    <a href={'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId || '')} target="_blank" rel="noreferrer" style={{color:'#facc15',fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>Open video ↗</a>
                  </div>;
                })}
              </div>}
              <p className="clip-studio-hint" style={{marginBottom:0}}>YouTube sign-in lets Defchat browse your channel uploads. YouTube does not provide an API to download the original video file, so choose the video file below to create clips.</p>
            </div>
            <label className="clip-studio-field-label" htmlFor="clip-source-url">Video URL</label>
            <div className="clip-studio-url-row"><input id="clip-source-url" className="clip-studio-input" type="url" value={sourceUrl} onChange={event => {setSourceUrl(event.target.value);resetResults()}} placeholder="Paste a supported video-page link or direct video URL…"/><button className="clip-studio-primary" type="button" onClick={analyze} disabled={busy || (Boolean(source) && !authorizedSource)}>{busy ? <LoaderCircle size={16} className="spin"/> : <Sparkles size={16}/>} Import & create clips</button></div>
            <p className="clip-studio-hint">{source ? <><Play size={12} style={{verticalAlign:'-2px',marginRight:5,color:'#facc15'}}/>{source} link detected. Defchat can import supported public videos when you confirm you have permission to use them.</> : 'Paste a supported public video link or a direct HTTPS video-file URL. Private, login-only, and DRM-protected videos are not supported.'}</p>
            {source && <label style={{display:'flex',alignItems:'flex-start',gap:9,margin:'0 0 14px',fontSize:11,lineHeight:1.5,color:'#c8c8d2'}}><input type="checkbox" checked={authorizedSource} onChange={event=>setAuthorizedSource(event.target.checked)} style={{marginTop:2,accentColor:'#facc15'}}/><span>I own this video or have permission to download and process it.</span></label>}
          </> : <>
            <label className="clip-studio-field-label">Video file</label>
            <input ref={fileInput} type="file" accept="video/*,.mp4,.mov,.webm,.m4v" hidden onChange={event => {setFile(event.target.files?.[0] || null);resetResults()}}/>
            <button type="button" className="clip-studio-drop" onClick={() => fileInput.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => {event.preventDefault();const dropped=event.dataTransfer.files?.[0];if(dropped&&dropped.type.startsWith('video/')){setFile(dropped);resetResults()}else setError('Drop a supported video file.')}}>
              <span className="clip-studio-drop-icon"><Upload size={22}/></span><b>{file ? file.name : 'Choose a video or drag it here'}</b><span>{file ? ((file.size / 1024 / 1024).toFixed(1) + ' MB · local preview ready') : 'MP4, MOV, WebM and other browser-supported video formats'}</span>
            </button>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:13}}><button className="clip-studio-primary" type="button" onClick={analyze} disabled={busy || !file}>{busy ? <LoaderCircle size={16} className="spin"/> : <Sparkles size={16}/>} Create clips in browser</button></div>
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
          {notice && <div className="clip-studio-notice clip-studio-success" role="status"><CheckCircle2 size={15} style={{verticalAlign:'-3px',marginRight:7}}/>{notice}{busy && <div style={{height:5,background:'#3a3420',borderRadius:99,overflow:'hidden',marginTop:10}}><div style={{height:'100%',width:Math.max(4,progress)+'%',background:'linear-gradient(90deg,#facc15,#f59e0b)',transition:'width .25s'}}/></div>}</div>}
          <div className="clip-studio-footer"><AlertCircle size={15}/><span>Video processing runs inside your browser using the free FFmpeg WebAssembly engine. This version creates evenly spaced MP4 clips; AI highlight detection and burned-in captions are not included yet.</span></div>
        </section>

        <section className="clip-studio-panel">
          <div className="clip-studio-panel-head"><span className="clip-studio-panel-icon"><Play size={18}/></span><div><h2>Source preview</h2><p>{file ? 'Local file preview' : youtubeId ? 'Video link preview' : source ? source + ' source link' : 'Your video appears here'}</p></div></div>
          <div className="clip-studio-preview">
            {videoUrl ? <video ref={videoRef} src={videoUrl} controls playsInline onLoadedMetadata={onVideoReady} /> : youtubeId ? <iframe title="YouTube video preview" src={'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(youtubeId)} style={{display:'block',width:'100%',aspectRatio:'16/9',border:0,background:'#050506'}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <div className="clip-studio-empty-preview"><Film size={30}/><div><b>Ready for your next highlight</b><p>Paste a supported video link and confirm permission to import it, or upload a video file.</p></div></div>}
            <div className="clip-studio-video-meta"><span>{file ? file.name : youtubeId ? 'YouTube video' : source || 'No source selected'}</span><span className="clip-studio-pill">{duration ? formatTime(duration) : youtubeId ? 'Link preview' : 'No duration'}</span></div>
          </div>
          {sourceUrl && source && <div style={{marginTop:12,fontSize:11,color:'#a3a3b2'}}>Source link: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{color:'#facc15',wordBreak:'break-all'}}><ExternalLink size={11} style={{verticalAlign:'-2px',marginRight:4}}/>Open original video</a></div>}
        </section>
      </div>

      {clips.length > 0 && <section className="clip-studio-results">
        <div className="clip-studio-results-head"><div><h2>Your clips</h2><p>{clips.length} clip{clips.length === 1 ? '' : 's'} returned by the processing service.</p></div><button className="clip-studio-primary" type="button" onClick={downloadAll}><Download size={15}/> Download all</button></div>
        <div className="clip-studio-results-grid">{clips.map((clip,index) => <article className="clip-studio-card" key={clip.id}>
          <div className="clip-studio-card-thumb">{clip.thumbnailUrl ? <img src={clip.thumbnailUrl} alt=""/> : clip.videoUrl ? <video src={clip.videoUrl} muted playsInline preload="metadata"/> : <Film size={28} color="#facc15"/>}<span className="clip-studio-card-duration">{formatTime(clip.end - clip.start)}</span></div>
          <div className="clip-studio-card-body"><h3>{clip.title || 'Highlight ' + (index + 1)}</h3><p>{formatTime(clip.start)}–{formatTime(clip.end)}{clip.caption ? ' · ' + clip.caption : ''}</p><div className="clip-studio-card-actions"><button type="button" onClick={() => seekTo(clip)}><Play size={12}/> Preview</button>{(clip.downloadUrl || clip.videoUrl) ? <a className="clip-download" href={clip.downloadUrl || clip.videoUrl} download={'defchat-clip-' + (index + 1) + '.mp4'} target="_blank" rel="noopener noreferrer"><Download size={12}/> Download</a> : <button type="button" disabled title="The backend has not returned a rendered clip">Export pending</button>}</div></div>
        </article>)}</div>
      </section>}
      <div className="clip-studio-footer"><Captions size={15}/><span>Posting directly to TikTok, YouTube Shorts, Instagram Reels, or LinkedIn requires the relevant platform API, account authorization, and permissions. Downloading your clips remains the basic export path.</span></div>
    </div>
  </div>;
}
