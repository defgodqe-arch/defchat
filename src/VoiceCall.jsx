import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X, LoaderCircle } from 'lucide-react';

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function VoiceCall({ db, user, peer }) {
  const [incoming, setIncoming] = useState(null);
  const [call, setCall] = useState(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState('');
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const incomingRef = useRef(null);
  const callRef = useRef(null);
  const queuedIceRef = useRef([]);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const seenRef = useRef(new Set());

  const sendSignal = useCallback(async (recipientId, callId, type, payload = {}) => {
    const { error: sendError } = await db.from('voice_call_signals').insert({
      call_id: callId, sender_id: user.id, recipient_id: recipientId, signal_type: type, payload
    });
    if (sendError) throw sendError;
  }, [db, user?.id]);

  const cleanup = useCallback(() => {
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    remoteStreamRef.current = null;
    queuedIceRef.current = [];
    incomingRef.current = null;
    callRef.current = null;
    setIncoming(null);
    setCall(null);
    setBusy(false);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const makePeerConnection = useCallback((recipientId, callId, videoEnabled) => {
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;
    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    pc.ontrack = event => {
      event.streams[0]?.getTracks().forEach(track => {
        if (!remote.getTracks().some(t => t.id === track.id)) remote.addTrack(track);
      });
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
    };
    pc.onicecandidate = event => {
      if (event.candidate) {
        sendSignal(recipientId, callId, 'ice-candidate', { candidate: event.candidate.toJSON() }).catch(e => setError(e.message || 'Could not send connection data.'));
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') setError('Connection failed. Your network may require a TURN relay.');
      if (pc.connectionState === 'connected') setError('');
    };
    return pc;
  }, [sendSignal]);

  const getMedia = useCallback(async videoEnabled => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone and camera access requires HTTPS or localhost in a supported browser.');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: videoEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
    });
    streamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  const startCall = useCallback(async videoEnabled => {
    if (!peer?.user_id || peer.user_id === user.id || busy || callRef.current) return;
    setBusy(true); setError('');
    const callId = crypto.randomUUID();
    try {
      const stream = await getMedia(videoEnabled);
      const pc = makePeerConnection(peer.user_id, callId, videoEnabled);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const next = { id: callId, peerId: peer.user_id, peerName: peer.username || 'User', video: videoEnabled, status: 'Calling…', outgoing: true };
      callRef.current = next; setCall(next);
      await sendSignal(peer.user_id, callId, 'offer', { sdp: pc.localDescription, video: videoEnabled });
    } catch (e) {
      cleanup();
      setError(e.name === 'NotAllowedError' ? 'Allow microphone/camera access in your browser to call.' : (e.message || 'Could not start the call.'));
    } finally { setBusy(false); }
  }, [peer, user?.id, busy, getMedia, makePeerConnection, sendSignal, cleanup]);

  const acceptCall = useCallback(async () => {
    const offer = incomingRef.current;
    if (!offer || busy) return;
    setBusy(true); setError('');
    try {
      const videoEnabled = !!offer.video;
      const stream = await getMedia(videoEnabled);
      const pc = makePeerConnection(offer.sender_id, offer.call_id, videoEnabled);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
      for (const candidate of queuedIceRef.current.splice(0)) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const next = { id: offer.call_id, peerId: offer.sender_id, peerName: offer.senderName || 'User', video: videoEnabled, status: 'Connected', outgoing: false };
      callRef.current = next; setCall(next); setIncoming(null); incomingRef.current = null;
      await sendSignal(offer.sender_id, offer.call_id, 'answer', { sdp: pc.localDescription });
    } catch (e) {
      setError(e.name === 'NotAllowedError' ? 'Allow microphone/camera access to answer.' : (e.message || 'Could not answer the call.'));
      try { await sendSignal(offer.sender_id, offer.call_id, 'reject'); } catch {}
      cleanup();
    } finally { setBusy(false); }
  }, [busy, getMedia, makePeerConnection, sendSignal, cleanup]);

  const declineCall = useCallback(async () => {
    const offer = incomingRef.current;
    if (offer) { try { await sendSignal(offer.sender_id, offer.call_id, 'reject'); } catch {} }
    cleanup();
  }, [sendSignal, cleanup]);

  const hangUp = useCallback(async () => {
    const active = callRef.current;
    if (active) { try { await sendSignal(active.peerId, active.id, 'hangup'); } catch {} }
    cleanup();
  }, [sendSignal, cleanup]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = db.channel('defchat-call-signals-' + user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'voice_call_signals',
        filter: 'recipient_id=eq.' + user.id
      }, async ({ new: signal }) => {
        if (!signal || seenRef.current.has(signal.id)) return;
        seenRef.current.add(signal.id);
        const active = callRef.current;
        if (signal.signal_type === 'offer') {
          if (active || incomingRef.current) {
            try { await sendSignal(signal.sender_id, signal.call_id, 'reject'); } catch {}
            return;
          }
          const { data: sender } = await db.from('profiles').select('username,avatar_url').eq('id', signal.sender_id).maybeSingle();
          const next = { ...signal, ...(signal.payload || {}), sdp: signal.payload?.sdp, video: !!signal.payload?.video, senderName: sender?.username || 'Someone' };
          incomingRef.current = next; setIncoming(next);
          return;
        }
        if (signal.signal_type === 'ice-candidate') {
          if (active?.id !== signal.call_id) return;
          const candidate = signal.payload?.candidate;
          if (!candidate) return;
          if (pcRef.current?.remoteDescription) {
            try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
          } else queuedIceRef.current.push(candidate);
          return;
        }
        if (active?.id !== signal.call_id) return;
        if (signal.signal_type === 'answer' && pcRef.current && signal.payload?.sdp) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.payload.sdp));
            for (const candidate of queuedIceRef.current.splice(0)) {
              try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
            }
            const next = { ...active, status: 'Connected' }; callRef.current = next; setCall(next);
          } catch (e) { setError(e.message || 'Could not connect the call.'); }
        } else if (signal.signal_type === 'hangup' || signal.signal_type === 'reject') {
          setError(signal.signal_type === 'reject' ? 'The other person declined the call.' : 'The call ended.');
          cleanup();
        }
      }).subscribe();
    const listener = event => {
      const video = !!event.detail?.video;
      startCall(video);
    };
    window.addEventListener('defchat:start-call', listener);
    return () => {
      window.removeEventListener('defchat:start-call', listener);
      db.removeChannel(channel);
    };
  }, [db, user?.id, sendSignal, startCall, cleanup]);

  useEffect(() => {
    if (localVideoRef.current && streamRef.current) localVideoRef.current.srcObject = streamRef.current;
  }, [call, incoming]);

  if (!incoming && !call && !busy && !error) return null;
  const panelStyle = { position: 'fixed', zIndex: 10000, right: 22, bottom: 22, width: 'min(430px, calc(100vw - 28px))', maxHeight: 'calc(100vh - 36px)', overflow: 'auto', padding: 20, borderRadius: 20, background: '#15161b', color: '#f8fafc', border: '1px solid #353741', boxShadow: '0 20px 70px #0009', fontFamily: 'inherit' };
  const actionStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 0, borderRadius: 12, padding: '11px 14px', cursor: 'pointer', fontWeight: 700, color: '#fff' };
  return <section style={panelStyle} aria-label="Voice and video call">
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ flex: 1 }}><b style={{ fontSize: 16 }}>{incoming && !call ? 'Incoming ' + (incoming.video ? 'video' : 'voice') + ' call' : call ? (call.video ? 'Video call' : 'Voice call') : 'Starting call…'}</b><div style={{ color: '#a1a1aa', fontSize: 13, marginTop: 3 }}>{incoming && !call ? incoming.senderName : call?.peerName || 'Connecting…'}{call?.status ? ' · ' + call.status : ''}</div></div>
      <button onClick={hangUp} aria-label="Close call panel" style={{ ...actionStyle, padding: 8, background: '#30313a' }}><X size={18}/></button>
    </div>
    {error && <p role="alert" style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>}
    {call?.video && <div style={{ position: 'relative', background: '#09090b', borderRadius: 14, overflow: 'hidden', aspectRatio: '16 / 9', marginBottom: 14 }}>
      <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
      <video ref={localVideoRef} autoPlay muted playsInline style={{ position: 'absolute', width: 96, height: 72, right: 10, bottom: 10, objectFit: 'cover', borderRadius: 10, background: '#27272a' }}/>
    </div>}
    {incoming && !call && <p style={{ color: '#d4d4d8', fontSize: 14 }}>Someone is calling you on defchat. Allow access to your {incoming.video ? 'camera and microphone' : 'microphone'} to answer.</p>}
    {incoming && !call ? <div style={{ display: 'flex', gap: 9 }}><button disabled={busy} onClick={acceptCall} style={{ ...actionStyle, flex: 1, background: '#16a34a' }}>{busy ? <LoaderCircle size={17}/> : <Phone size={17}/>} Accept</button><button onClick={declineCall} style={{ ...actionStyle, flex: 1, background: '#dc2626' }}><PhoneOff size={17}/> Decline</button></div> :
      call ? <div style={{ display: 'flex', gap: 9, justifyContent: 'center' }}>
        <button onClick={() => { const next = !muted; setMuted(next); streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; }); }} title={muted ? 'Unmute microphone' : 'Mute microphone'} style={{ ...actionStyle, background: muted ? '#b91c1c' : '#30313a' }}>{muted ? <MicOff size={18}/> : <Mic size={18}/>}</button>
        {call.video && <button onClick={() => { const next = !cameraOff; setCameraOff(next); streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !next; }); }} title={cameraOff ? 'Turn camera on' : 'Turn camera off'} style={{ ...actionStyle, background: cameraOff ? '#b91c1c' : '#30313a' }}>{cameraOff ? <VideoOff size={18}/> : <Video size={18}/>}</button>}
        <button onClick={hangUp} title="End call" style={{ ...actionStyle, background: '#dc2626' }}><PhoneOff size={18}/> End call</button>
      </div> : <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a1a1aa', fontSize: 13 }}><LoaderCircle size={17}/> Requesting media permissions…</div>}
  </section>;
}
