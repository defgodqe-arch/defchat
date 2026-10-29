import os, re, time, tempfile, subprocess, threading
from pathlib import Path
from urllib.parse import urlparse
import requests
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from faster_whisper import WhisperModel
import yt_dlp

app = FastAPI(title="defchat AI Clip Processor", version="1.1.0")
ALLOWED_ORIGINS = {"https://defgodqe-arch.github.io", "http://localhost:5173", "http://127.0.0.1:5173"}
app.add_middleware(CORSMiddleware, allow_origins=list(ALLOWED_ORIGINS), allow_credentials=False, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
PROCESSOR_KEY = os.environ.get("CLIP_PROCESSOR_KEY", "")
MAX_SOURCE_BYTES = int(os.environ.get("MAX_SOURCE_BYTES", str(2 * 1024**3)))
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
_jobs = {}
_model = None
_lock = threading.Lock()

class ClipRequest(BaseModel):
    jobId: str
    userId: str
    sourceType: str
    sourceUrl: str
    clipLength: int = Field(ge=10, le=180)
    clipCount: int = Field(ge=1, le=20)
    aspectRatio: str
    captionStyle: str
    output: dict

def run(cmd):
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode:
        raise RuntimeError((result.stderr or "Media processing failed")[-1800:])
    return result.stdout.strip()

def admin_headers():
    if not SUPABASE_URL or not SERVICE_KEY:
        raise RuntimeError("Processor requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
    return {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}

def update_job(job_id, status, clips=None, error=None):
    body = {"status": status, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    if clips is not None: body["clips"] = clips
    if error: body["error_message"] = str(error)[:500]
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/clip_jobs?id=eq.{job_id}", headers={**admin_headers(), "Content-Type":"application/json", "Prefer":"return=minimal"}, json=body, timeout=30)
    r.raise_for_status()

def download_source(url, workdir):
    target = str(Path(workdir) / "source.mp4")
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"): raise RuntimeError("Video source must use HTTP or HTTPS.")
    if "supabase.co" in parsed.netloc or Path(parsed.path).suffix.lower() in (".mp4", ".mov", ".m4v", ".webm", ".mkv"):
        with requests.get(url, stream=True, timeout=(20, 1800), allow_redirects=True) as response:
            response.raise_for_status()
            length = int(response.headers.get("content-length", "0") or 0)
            if length > MAX_SOURCE_BYTES: raise RuntimeError("Source video exceeds the processor size limit.")
            count = 0
            with open(target, "wb") as out:
                for chunk in response.iter_content(1024*1024):
                    if chunk:
                        count += len(chunk)
                        if count > MAX_SOURCE_BYTES: raise RuntimeError("Source video exceeds the processor size limit.")
                        out.write(chunk)
        return target
    opts = {"format":"bestvideo[height<=1080]+bestaudio/best[height<=1080]/best", "outtmpl":str(Path(workdir)/"source.%(ext)s"), "merge_output_format":"mp4", "noplaylist":True, "quiet":True, "no_warnings":True, "max_filesize":MAX_SOURCE_BYTES}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        candidate = ydl.prepare_filename(info)
        if not os.path.exists(candidate):
            candidate = str(Path(workdir)/"source.mp4")
        if not os.path.exists(candidate):
            found = list(Path(workdir).glob("source.*"))
            if not found: raise RuntimeError("Source platform did not provide a downloadable video. Upload a video you own instead.")
            candidate = str(found[0])
    if os.path.getsize(candidate) > MAX_SOURCE_BYTES: raise RuntimeError("Downloaded video exceeds the processor size limit.")
    return candidate

def transcribe(path):
    global _model
    with _lock:
        if _model is None: _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    segments, _ = _model.transcribe(path, vad_filter=True, word_timestamps=True)
    return list(segments)

def choose_highlights(segments, duration, count, length):
    if duration <= length: return [(0, duration)]
    candidates = []
    step = max(5, min(12, length // 3))
    for start in range(0, max(1, int(duration-length)+1), step):
        end = min(duration, start+length)
        items = [s for s in segments if s.end > start and s.start < end]
        text = " ".join(s.text for s in items).strip()
        words = re.findall(r"\b[\w']+\b", text.lower())
        if len(words) < 5: continue
        expressive = sum(text.count(c) for c in "!?") * 2
        unique = len(set(words)) / max(1, len(words))
        speech = min(len(words) / max(1, length), 3)
        candidates.append((speech + expressive + unique * 2, float(start), float(end)))
    candidates.sort(reverse=True)
    chosen = []
    for score, start, end in candidates:
        if all(end <= a or start >= b for a,b in chosen):
            chosen.append((start,end))
            if len(chosen) >= count: break
    if not chosen:
        chosen = [(float(i), min(duration, float(i)+length)) for i in range(0, int(duration-length)+1, length)][:count]
    return sorted(chosen)

def ass_time(seconds):
    h=int(seconds//3600); m=int((seconds%3600)//60); s=seconds%60
    return f"{h}:{m:02d}:{s:05.2f}"

def make_ass(segments, start, end, path, style):
    size = 58 if style == "bold" else 48 if style == "karaoke" else 42
    outline = 4 if style in ("bold","karaoke") else 2
    with open(path,"w",encoding="utf-8") as f:
        f.write("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\n\n[V4+ Styles]\n")
        f.write("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
        f.write(f"Style: Default,DejaVu Sans,{size},&H00FFFFFF,&H0000D7FF,&H00101010,&H80000000,{-1 if style in ('bold','karaoke') else 0},0,1,{outline},2,2,70,70,180,1\n\n")
        f.write("[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        for seg in segments:
            a=max(start,seg.start); b=min(end,seg.end)
            if b<=a: continue
            text=seg.text.strip().replace("\\","\\\\").replace("{","(").replace("}",")").replace("\n"," ")
            if text: f.write(f"Dialogue: 0,{ass_time(a-start)},{ass_time(b-start)},Default,,0,0,0,,{text}\n")

def process(payload):
    job_id = payload["jobId"]
    try:
        with tempfile.TemporaryDirectory(prefix="defchat-clips-") as work:
            source = download_source(payload["sourceUrl"], work)
            duration = float(run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",source]))
            if duration < 3: raise RuntimeError("The source video is too short to clip.")
            segments = transcribe(source)
            spans = choose_highlights(segments, duration, payload["clipCount"], payload["clipLength"])
            clips = []
            bucket = payload["output"].get("bucket","clip-studio")
            prefix = payload["output"].get("prefix","")
            ratio = payload.get("aspectRatio","9:16")
            dims = {"9:16":"1080:1920","1:1":"1080:1080","16:9":"1920:1080"}[ratio]
            for i,(start,end) in enumerate(spans,1):
                out = str(Path(work)/f"clip-{i:02d}.mp4")
                ass = str(Path(work)/f"clip-{i:02d}.ass")
                make_ass(segments,start,end,ass,payload.get("captionStyle","bold"))
                vf=f"scale={dims}:force_original_aspect_ratio=increase,crop={dims},subtitles={ass}:fontsdir=/usr/share/fonts/truetype/dejavu"
                run(["ffmpeg","-hide_banner","-loglevel","error","-y","-ss",str(start),"-i",source,"-t",str(end-start),"-vf",vf,"-c:v","libx264","-preset","veryfast","-crf","23","-c:a","aac","-b:a","128k","-movflags","+faststart",out])
                object_path=f"{prefix}clip-{i:02d}.mp4"
                with open(out,"rb") as media:
                    upload=requests.post(f"{SUPABASE_URL}/storage/v1/object/{bucket}/{object_path}",headers={**admin_headers(),"Content-Type":"video/mp4","x-upsert":"true"},data=media,timeout=600)
                upload.raise_for_status()
                signed=requests.post(f"{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{object_path}",headers={**admin_headers(),"Content-Type":"application/json"},json={"expiresIn":604800},timeout=30)
                signed.raise_for_status()
                signed_path=signed.json().get("signedURL") or signed.json().get("signedUrl")
                if not signed_path: raise RuntimeError("Storage did not return a download URL.")
                if signed_path.startswith("/"): signed_path=SUPABASE_URL+"/storage/v1"+signed_path
                elif not signed_path.startswith("http"): signed_path=SUPABASE_URL+"/storage/v1/"+signed_path.lstrip("/")
                transcript=" ".join(s.text.strip() for s in segments if s.end>start and s.start<end).strip()
                clips.append({"id":f"{job_id}-{i}","title":f"Highlight {i}","start":round(start,2),"end":round(end,2),"captionText":transcript[:400],"videoUrl":signed_path,"downloadUrl":signed_path,"storagePath":object_path})
            update_job(job_id,"completed",clips=clips)
            _jobs[job_id]={"status":"completed","clips":clips}
    except Exception as exc:
        try: update_job(job_id,"failed",error=str(exc))
        except Exception: pass
        _jobs[job_id]={"status":"failed","error":str(exc)[:500]}

@app.get("/health")
def health():
    return {"ok":True,"service":"defchat-ai-clip-processor","configured":bool(SUPABASE_URL and SERVICE_KEY),"mode":"local"}

@app.post("/process-local")
def process_local(payload: ClipRequest, request: Request):
    if request.headers.get("origin", "") not in ALLOWED_ORIGINS:
        raise HTTPException(403, "This local processor only accepts requests from the defchat website.")
    if not SUPABASE_URL or not SERVICE_KEY:
        raise HTTPException(503, "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in clip-processor/.env first.")
    if payload.output.get("prefix", "").split("/")[0] != payload.userId:
        raise HTTPException(400, "Output prefix must be scoped to the signed-in user.")
    if payload.sourceType not in ("url", "upload"):
        raise HTTPException(400, "Unsupported source type.")
    if payload.aspectRatio not in ("9:16", "1:1", "16:9"):
        raise HTTPException(400, "Unsupported aspect ratio.")
    if payload.captionStyle not in ("bold", "minimal", "karaoke"):
        raise HTTPException(400, "Unsupported caption style.")
    if payload.jobId in _jobs and _jobs[payload.jobId].get("status") == "processing":
        return {"jobId": payload.jobId, "status": "processing", "clips": []}
    _jobs[payload.jobId] = {"status": "processing"}
    threading.Thread(target=process, args=(payload.model_dump(),), daemon=True).start()
    return {"jobId": payload.jobId, "status": "processing", "clips": []}

@app.post("/process")
def process_endpoint(payload: ClipRequest, authorization: str | None = Header(default=None)):
    if not PROCESSOR_KEY or authorization != "Bearer "+PROCESSOR_KEY:
        raise HTTPException(401,"Invalid processor key. Configure CLIP_PROCESSOR_KEY.")
    if not SUPABASE_URL or not SERVICE_KEY: raise HTTPException(503,"Processor storage credentials are not configured.")
    if payload.output.get("prefix","").split("/")[0] != payload.userId: raise HTTPException(400,"Output prefix must be scoped to the authenticated user.")
    if payload.sourceType not in ("url","upload"): raise HTTPException(400,"Unsupported source type.")
    if payload.aspectRatio not in ("9:16","1:1","16:9"): raise HTTPException(400,"Unsupported aspect ratio.")
    if payload.captionStyle not in ("bold","minimal","karaoke"): raise HTTPException(400,"Unsupported caption style.")
    if payload.jobId in _jobs and _jobs[payload.jobId].get("status")=="processing": return {"jobId":payload.jobId,"status":"processing"}
    _jobs[payload.jobId]={"status":"processing"}
    threading.Thread(target=process,args=(payload.model_dump(),),daemon=True).start()
    return {"jobId":payload.jobId,"status":"processing","clips":[]}

@app.get("/jobs/{job_id}")
def job_status(job_id: str):
    return _jobs.get(job_id,{"jobId":job_id,"status":"unknown"})
