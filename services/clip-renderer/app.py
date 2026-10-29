import os, re, math, secrets, tempfile, subprocess, time
from pathlib import Path
from urllib.parse import urlparse
import requests
import numpy as np
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="defchat self-hosted clip renderer", version="1.0.0")
WORK = Path(os.getenv("WORK_DIR", "/tmp/defchat-clips"))
WORK.mkdir(parents=True, exist_ok=True)
MAX_BYTES = int(os.getenv("MAX_SOURCE_BYTES", str(1024 * 1024 * 1024)))
MAX_SECONDS = int(os.getenv("MAX_SOURCE_SECONDS", "7200"))
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
PROCESSOR_KEY = os.environ["CLIP_PROCESSOR_KEY"]
BUCKET = os.getenv("CLIP_BUCKET", "clip-studio")
ASR_MODEL = os.getenv("WHISPER_MODEL", "base")
ENABLE_ASR = os.getenv("ENABLE_ASR", "true").lower() == "true"

class Job(BaseModel):
    jobId: str
    userId: str
    sourceType: str
    sourceUrl: str
    clipLength: int = Field(30, ge=10, le=180)
    clipCount: int = Field(5, ge=1, le=20)
    aspectRatio: str = "9:16"
    captionStyle: str = "bold"
    output: dict

def run(args, timeout=900):
    p = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if p.returncode:
        raise RuntimeError(p.stderr.decode("utf-8", "replace")[-2500:])
    return p.stdout

def probe(path):
    raw = run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",str(path)], 60)
    return float(raw.decode().strip())

def fetch_source(url, path):
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Only HTTPS video URLs are accepted.")
    host = parsed.hostname.lower()
    if host == "youtube.com" or host.endswith(".youtube.com") or host == "youtu.be" or host == "vimeo.com" or host.endswith(".vimeo.com") or host == "twitch.tv" or host.endswith(".twitch.tv"):
        raise ValueError("Platform webpage links are not downloadable video files. Upload a video you own or provide an authorized direct HTTPS video-file URL.")
    total = 0
    with requests.get(url, stream=True, timeout=(15, 90), allow_redirects=True) as r:
        r.raise_for_status()
        ctype = r.headers.get("content-type", "").lower()
        if not ctype.startswith("video/") and not re.search(r"\.(mp4|mov|webm|m4v|mkv)(?:$|\?)", r.url, re.I):
            raise ValueError("URL did not return a direct video file.")
        with open(path, "wb") as f:
            for chunk in r.iter_content(1024 * 1024):
                if not chunk: continue
                total += len(chunk)
                if total > MAX_BYTES: raise ValueError("Source exceeds the configured upload size limit.")
                f.write(chunk)

def highlight_starts(path, duration, length, count):
    # Rank non-overlapping windows by mean audio energy; fall back to evenly spaced windows.
    window = min(max(5, length / 2), 15)
    try:
        pcm = run(["ffmpeg","-v","error","-i",str(path),"-vn","-ac","1","-ar","8000","-f","f32le","pipe:1"], 300)
        audio = np.frombuffer(pcm, dtype=np.float32)
        if len(audio) < 8000: raise ValueError("No usable audio")
        hop = 8000
        samples = int(window * hop)
        ranked = []
        for start in np.arange(0, max(1, len(audio)-samples), samples//2):
            chunk = audio[int(start):int(start)+samples]
            if len(chunk) == 0: continue
            rms = float(np.sqrt(np.mean(chunk * chunk)))
            ranked.append((rms, float(start / hop)))
        ranked.sort(reverse=True)
        chosen = []
        for score, start in ranked:
            start = min(max(0, start - max(0, (length-window)/2)), max(0, duration-length))
            if all(abs(start-x) >= length * .8 for x in chosen):
                chosen.append(start)
                if len(chosen) >= count: break
        if chosen: return sorted(chosen)
    except Exception:
        pass
    available = max(0, duration-length)
    return [available*i/max(1,count-1) for i in range(min(count, max(1, int(duration//length))))]

def caption_filter(path, start, length, style):
    if not ENABLE_ASR: return None
    try:
        from faster_whisper import WhisperModel
        global whisper
        if "whisper" not in globals():
            whisper = WhisperModel(ASR_MODEL, device="cpu", compute_type="int8")
        segments, _ = whisper.transcribe(str(path), language=None, vad_filter=True)
        lines = []
        for seg in segments:
            if seg.end < start or seg.start > start+length: continue
            text = seg.text.strip().replace("'", "\\'")
            if text: lines.append(f"Dialogue: 0,{max(0,seg.start-start):.2f},{min(length,seg.end-start):.2f},Default,,0,0,0,,{text}")
        if not lines: return None
        ass = path.parent / (secrets.token_hex(6)+".ass")
        bold = "-1" if style == "bold" else "0"
        ass.write_text("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,58,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,"+bold+",0,1,4,1,2,60,60,180,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"+"\n".join(lines), encoding="utf-8")
        return ass
    except Exception:
        return None

def upload(path, storage_path):
    headers = {"Authorization":"Bearer "+SUPABASE_SERVICE_ROLE_KEY, "apikey":SUPABASE_SERVICE_ROLE_KEY, "Content-Type":"video/mp4", "x-upsert":"true"}
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    r = requests.post(url, headers=headers, data=open(path,"rb"), timeout=300)
    if r.status_code >= 300: raise RuntimeError("Supabase Storage upload failed: "+r.text[:500])
    signed = requests.post(f"{SUPABASE_URL}/storage/v1/object/sign/{BUCKET}/{storage_path}", headers={"Authorization":"Bearer "+SUPABASE_SERVICE_ROLE_KEY,"apikey":SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json"}, json={"expiresIn":604800}, timeout=30)
    signed.raise_for_status()
    return SUPABASE_URL+"/storage/v1"+signed.json()["signedURL"]

@app.get("/health")
def health():
    return {"ok": True, "ffmpeg": subprocess.run(["ffmpeg","-version"],capture_output=True).returncode == 0}

@app.post("/process")
def process(job: Job, authorization: str = Header(default="")):
    if not secrets.compare_digest(authorization.removeprefix("Bearer ").strip(), PROCESSOR_KEY):
        raise HTTPException(401, "Invalid processor credentials")
    if job.aspectRatio not in ("9:16","1:1","16:9"): raise HTTPException(400,"Unsupported aspect ratio")
    if job.output.get("prefix") != f"{job.userId}/{job.jobId}/": raise HTTPException(400,"Invalid output path")
    with tempfile.TemporaryDirectory(dir=WORK) as tmp:
        root=Path(tmp); source=root/"source.mp4"
        try:
            fetch_source(job.sourceUrl, source)
            duration=probe(source)
            if duration <= 0 or duration > MAX_SECONDS: raise ValueError("Video duration is outside the allowed limit.")
            starts=highlight_starts(source,duration,job.clipLength,job.clipCount)
            dimensions={"9:16":(1080,1920),"1:1":(1080,1080),"16:9":(1920,1080)}[job.aspectRatio]
            clips=[]
            for idx,start in enumerate(starts,1):
                out=root/f"clip-{idx}.mp4"
                w,h=dimensions
                vf=f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
                ass=caption_filter(source,start,job.clipLength,job.captionStyle)
                if ass: vf += ",ass="+str(ass).replace(":","\\:")
                run(["ffmpeg","-y","-ss",str(start),"-i",str(source),"-t",str(min(job.clipLength,duration-start)),"-vf",vf,"-c:v","libx264","-preset","veryfast","-crf","23","-c:a","aac","-b:a","128k","-movflags","+faststart",str(out)],900)
                key=job.output["prefix"]+f"clip-{idx}.mp4"
                url=upload(out,key)
                clips.append({"id":f"{job.jobId}-{idx}","title":f"Clip {idx}","start":round(start,2),"end":round(min(duration,start+job.clipLength),2),"videoUrl":url,"downloadUrl":url,"path":key,"caption":"Audio-energy highlight; captions are included when speech recognition is enabled." if ENABLE_ASR else "Audio-energy highlight"})
            return {"status":"completed","clips":clips}
        except ValueError as e: raise HTTPException(400,str(e))
        except Exception as e: raise HTTPException(500,str(e)[:1000])
