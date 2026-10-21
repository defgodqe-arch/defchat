import React, { useEffect, useRef, useState } from 'react';
import { Bot, ExternalLink, Mic, MicOff, Paperclip, Search, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import './DefgodqeAI.css';

// This is a native defchat React feature, not an embedded external website.
// The API endpoint supplies model inference and audio generation only.
const AI_API = (import.meta.env.VITE_DEFGODQE_AI_API || 'https://ai.defgodqe.workers.dev').replace(/\/+$/, '');
const HISTORY_KEY = 'defchat:personal-ai:history';
const SYSTEM_PROMPT = 'You are defgodqe, the user’s personal AI assistant, created by defgodqe. If asked who created you, who made you, or who your creator is, clearly answer: “I was created by defgodqe.” Do not claim another person or company created you. Be warm, capable, conversational, concise when speaking aloud, and honest about actions you cannot perform.';
const VOICES = [['luna','Luna'],['orion','Orion'],['athena','Athena'],['apollo','Apollo'],['aurora','Aurora'],['draco','Draco'],['hera','Hera'],['zeus','Zeus']];
const WELCOME = [{ role: 'assistant', content: 'Hey! I’m defgodqe, your personal AI assistant. Ask me anything, type a message, or use the microphone to talk. I can read my replies aloud, too.' }];

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
    if (Array.isArray(saved) && saved.every(m => m && ['user','assistant'].includes(m.role) && typeof m.content === 'string')) return saved.slice(-80);
  } catch {}
  return WELCOME;
}

export default function DefgodqeAI({ onClose }) {
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speaker, setSpeaker] = useState('luna');
  const [voiceLanguage, setVoiceLanguage] = useState('auto');
  const [webSearch, setWebSearch] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready when you are');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-80).map(({ image, ...message }) => message))); } catch {} }, [messages]);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages, busy]);
  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      try { recognitionRef.current?.abort(); } catch {}
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith('blob:')) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function detectSpeechLanguage(text) {
    if (voiceLanguage === 'en' || voiceLanguage === 'es') return voiceLanguage;
    const sample = ' ' + String(text).toLowerCase() + ' ';
    const spanishHits = (sample.match(/\b(el|la|los|las|de|que|para|por|con|una|uno|como|pero|gracias|hola|estoy|puedo|tienes|quiero|porque|tambien|sí|si)\b/g) || []).length;
    const englishHits = (sample.match(/\b(the|and|you|your|for|with|this|that|what|how|can|have|are|was|hello|thanks|please|because|want|would)\b/g) || []).length;
    return /[¿¡ñáéíóúü]/i.test(sample) || spanishHits > englishHits ? 'es' : 'en';
  }

  function speakWithBrowser(text, lang) {
    if (!('speechSynthesis' in window)) throw new Error('Browser speech synthesis is unavailable');
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 4500));
    utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.toLowerCase().startsWith(lang === 'es' ? 'es' : 'en'));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => setStatus('Ready when you are');
    utterance.onerror = () => { setStatus('Ready when you are'); setError('Voice playback failed. You can still read replies.'); };
    window.speechSynthesis.speak(utterance);
  }

  async function speak(text) {
    if (!voiceEnabled || !text) return;
    stopAudio();
    setStatus('Speaking');
    const lang = detectSpeechLanguage(text);
    // The current hosted TTS voice is English-only; use the browser's Spanish voice
    // for Spanish replies so they are spoken with a Spanish locale instead of an English accent.
    if (lang === 'es') {
      try { speakWithBrowser(text, lang); return; }
      catch { setStatus('Ready when you are'); setError('Spanish speech is unavailable on this device. Install or enable a Spanish voice in system speech settings.'); return; }
    }
    try {
      const response = await fetch(AI_API + '/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Defgodqe-Client': 'defchat-web' },
        body: JSON.stringify({ text: text.slice(0, 4500), speaker })
      });
      if (!response.ok) throw new Error('Audio generation unavailable');
      const url = URL.createObjectURL(await response.blob());
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (objectUrlRef.current === url) objectUrlRef.current = null;
        if (audioRef.current === audio) audioRef.current = null;
        setStatus('Ready when you are');
      };
      audio.onerror = () => { URL.revokeObjectURL(url); setStatus('Ready when you are'); setError('Voice playback failed. You can still read replies.'); };
      await audio.play();
    } catch {
      try { speakWithBrowser(text, lang); }
      catch { setStatus('Ready when you are'); setError('Voice playback could not start. You can still read replies.'); }
    }
  }

  async function sendMessage(override) {
    const text = String(override ?? input).trim();
    if ((!text && !imageFile) || busy) return;
    setError('');
    stopAudio();
    setInput('');
    setBusy(true);
    const userMessage = { role: 'user', content: text || 'What is in this image?', ...(imagePreview ? { image: imagePreview } : {}) };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setStatus('Thinking');
    try {
      let endpoint = AI_API + '/chat';
      let body;
      const history = nextMessages.filter(m => !m.image).slice(-12).map(({ role, content }) => ({ role, content }));
      if (imageFile) {
        endpoint = AI_API + '/vision';
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Could not read that image.'));
          reader.readAsDataURL(imageFile);
        });
        body = JSON.stringify({ prompt: text || 'Describe this image and answer useful questions about it.', image: dataUrl });
      } else if (webSearch) {
        endpoint = AI_API + '/web-search';
        body = JSON.stringify({ query: text });
      } else {
        body = JSON.stringify({ messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history] });
      }
      const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Defgodqe-Client': 'defchat-web' }, body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.response) throw new Error(data.error || 'The assistant could not respond. Please try again.');
      const answer = String(data.response);
      setMessages(current => [...current, { role: 'assistant', content: answer, ...(Array.isArray(data.sources) && data.sources.length ? { sources: data.sources } : {}) }]);
      setStatus('Ready when you are');
      setWebSearch(false);
      if (voiceEnabled) void speak(answer);
    } catch (e) {
      setStatus('Ready when you are');
      setError(e.message || 'Could not connect to the assistant. Check your connection and try again.');
    } finally {
      setBusy(false);
      setImageFile(null);
      setImagePreview('');
      if (fileRef.current) fileRef.current.value = '';
      inputRef.current?.focus();
    }
  }

  function startListening() {
    setError('');
    if (!Recognition) { setError('Voice input is not supported here. Try Chrome or Edge, or type your message.'); return; }
    stopAudio();
    try { recognitionRef.current?.abort(); } catch {}
    const recognition = new Recognition();
    recognition.lang = voiceLanguage === 'es' ? 'es-ES' : voiceLanguage === 'en' ? 'en-US' : (navigator.language || 'en-US');
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalText = '';
    recognition.onstart = () => { setListening(true); setStatus('Listening'); };
    recognition.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      setInput((finalText || interim).trim());
    };
    recognition.onerror = event => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') setError(event.error === 'not-allowed' ? 'Microphone permission was denied. Allow it in your browser settings.' : 'Speech recognition error: ' + event.error);
    };
    recognition.onend = () => {
      setListening(false);
      setStatus('Ready when you are');
      recognitionRef.current = null;
      if (finalText.trim()) sendMessage(finalText.trim());
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setListening(false); setError('Could not start the microphone. Please try again.'); }
  }

  function stopListening() { try { recognitionRef.current?.stop(); } catch {} setListening(false); }

  function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    if (file.size > 7 * 1024 * 1024) { setError('Choose an image smaller than 7 MB.'); return; }
    setError('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearHistory() {
    setMessages(WELCOME);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    setError('');
  }

  return (
    <div className="dga-overlay" role="dialog" aria-modal="true" aria-label="Personal AI assistant">
      <section className="dga-app">
        <header className="dga-header">
          <div className="dga-brand-icon"><Sparkles size={22} /></div>
          <div className="dga-brand-copy"><strong>defgodqe <span>AI</span></strong><small>Your personal assistant · {status}</small></div>
          <button className="dga-icon-btn" type="button" onClick={() => window.open(AI_API + '/voice-studio.html', '_blank', 'noopener,noreferrer')} title="Open Drama 3 Voice Studio" aria-label="Open Drama 3 Voice Studio"><ExternalLink size={17} /></button>
          <button className="dga-icon-btn" type="button" onClick={clearHistory} title="Clear conversation" aria-label="Clear conversation">↻</button>
          <button className="dga-icon-btn" type="button" onClick={onClose} title="Back to chat" aria-label="Close assistant"><X size={19} /></button>
        </header>
        <div className="dga-voice-panel">
          <div className={'dga-orb' + (listening ? ' dga-listening' : status === 'Speaking' ? ' dga-speaking' : '')}><Bot size={27} /></div>
          <div className="dga-voice-copy"><strong>{listening ? 'I’m listening…' : status === 'Speaking' ? 'Speaking to you' : 'Talk to defgodqe'}</strong><small>{Recognition ? 'Use your voice or type naturally.' : 'Type naturally, or use a supported browser for voice input.'}</small></div>
          <button type="button" className={'dga-voice-btn' + (listening ? ' active' : '')} disabled={busy || !Recognition} onClick={listening ? stopListening : startListening} aria-label={listening ? 'Stop listening' : 'Start talking'}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>
          <button type="button" className={'dga-voice-btn' + (voiceEnabled ? ' active' : '')} onClick={() => { setVoiceEnabled(v => !v); if (voiceEnabled) stopAudio(); }} title={voiceEnabled ? 'Turn voice replies off' : 'Turn voice replies on'} aria-label={voiceEnabled ? 'Turn voice replies off' : 'Turn voice replies on'}>{voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <label className="dga-speaker"><span>Language</span><select value={voiceLanguage} onChange={e => setVoiceLanguage(e.target.value)} aria-label="Voice language"><option value="auto">Auto</option><option value="en">English</option><option value="es">Español</option></select></label><label className="dga-speaker"><span>Voice</span><select value={speaker} onChange={e => setSpeaker(e.target.value)}>{VOICES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="dga-messages" ref={listRef} aria-live="polite">
          {messages.map((message, index) => (
            <article key={index} className={'dga-message dga-' + message.role}>
              <div className="dga-message-avatar">{message.role === 'assistant' ? <Sparkles size={15} /> : <span>You</span>}</div>
              <div className="dga-message-body">
                <div className="dga-message-author">{message.role === 'assistant' ? 'defgodqe AI' : 'You'}</div>
                {message.image && <img className="dga-attached-image" src={message.image} alt="Your uploaded image" />}
                <div className="dga-message-text">{message.content}</div>
                {message.sources?.length > 0 && <div className="dga-sources">{message.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title || source.domain || source.url} <ExternalLink size={12} /></a>)}</div>}
              </div>
            </article>
          ))}
          {busy && <article className="dga-message dga-assistant"><div className="dga-message-avatar"><Sparkles size={15} /></div><div className="dga-message-body"><div className="dga-message-author">defgodqe AI</div><div className="dga-thinking"><i /><i /><i /> Thinking…</div></div></article>}
        </div>
        {imagePreview && <div className="dga-attachment"><img src={imagePreview} alt="Image ready to send" /><span>Image ready for AI vision</span><button type="button" onClick={() => { URL.revokeObjectURL(imagePreview); setImagePreview(''); setImageFile(null); if (fileRef.current) fileRef.current.value = ''; }} aria-label="Remove image"><X size={16} /></button></div>}
        {error && <div className="dga-error" role="alert">{error}</div>}
        <form className="dga-composer" onSubmit={event => { event.preventDefault(); sendMessage(); }}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={chooseImage} />
          <button type="button" className="dga-tool-btn" onClick={() => fileRef.current?.click()} disabled={busy} title="Ask about an image" aria-label="Attach image"><Paperclip size={18} /></button>
          <button type="button" className={'dga-tool-btn' + (webSearch ? ' selected' : '')} onClick={() => setWebSearch(v => !v)} disabled={busy || Boolean(imageFile)} title="Search the web" aria-label="Toggle web search"><Search size={17} /></button>
          <textarea ref={inputRef} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder={imageFile ? 'Ask about this image…' : webSearch ? 'What should I search for?' : 'Message your personal AI…'} rows={1} aria-label="Message your personal AI" disabled={busy} />
          <button className="dga-send-btn" type="submit" disabled={busy || (!input.trim() && !imageFile)} aria-label="Send message">{busy ? <span className="dga-spinner" /> : <Send size={18} />}</button>
        </form>
        <footer className="dga-footer"><span>✓ Personal assistant inside defchat</span><span>Enter to send · Shift+Enter for a new line</span></footer>
      </section>
    </div>
  );
}
