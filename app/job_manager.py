import os
import json
import uuid
import threading
import queue
from datetime import datetime
from pydub import AudioSegment

JOBS_DIR = "jobs"
os.makedirs(JOBS_DIR, exist_ok=True)
os.makedirs("outputs", exist_ok=True)

job_queue = queue.Queue()
engine = None

def init_engine():
    global engine
    if engine is None:
        from app.xtts_engine import XTTSVoiceCloner
        engine = XTTSVoiceCloner()
    return engine

def get_job_path(job_id):
    return os.path.join(JOBS_DIR, f"{job_id}.json")

def save_job(job_id, data):
    with open(get_job_path(job_id), "w") as f:
        json.dump(data, f)

def load_job(job_id):
    path = get_job_path(job_id)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None

def split_text(text, max_chars=1000):
    """Split text into chunks for processing"""
    sentences = text.replace('।', '.').replace('?', '?.').replace('!', '!.').split('.')
    chunks = []
    current = ""
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(current) + len(sentence) + 1 <= max_chars:
            current += sentence + ". "
        else:
            if current:
                chunks.append(current.strip())
            current = sentence + ". "
    
    if current:
        chunks.append(current.strip())
    
    return chunks if chunks else [text]

def merge_audio_files(file_list, output_path):
    """Merge multiple audio files into one"""
    combined = AudioSegment.empty()
    for f in file_list:
        if os.path.exists(f):
            audio = AudioSegment.from_wav(f)
            combined += audio
    combined.export(output_path, format="wav")
    # Cleanup temp files
    for f in file_list:
        if os.path.exists(f):
            os.remove(f)

def worker():
    """Background worker - processes TTS jobs"""
    eng = init_engine()
    
    while True:
        job_data = job_queue.get()
        job_id = job_data["job_id"]
        
        try:
            # Update status
            job = load_job(job_id)
            job["status"] = "processing"
            job["started_at"] = datetime.now().isoformat()
            save_job(job_id, job)
            
            text = job_data["text"]
            speaker_wav = job_data["speaker_wav"]
            out_wav = job_data["out_wav"]
            language = job_data.get("language", "en")
            
            # Split long text into chunks
            chunks = split_text(text, max_chars=1000)
            
            if len(chunks) == 1:
                # Short text - direct generation
                eng.generate(
                    text=chunks[0],
                    speaker_wav=speaker_wav,
                    out_path=out_wav,
                    language=language
                )
            else:
                # Long text - generate chunks and merge
                temp_files = []
                for i, chunk in enumerate(chunks):
                    temp_out = out_wav.replace(".wav", f"_part{i}.wav")
                    eng.generate(
                        text=chunk,
                        speaker_wav=speaker_wav,
                        out_path=temp_out,
                        language=language
                    )
                    temp_files.append(temp_out)
                    
                    # Update progress
                    job = load_job(job_id)
                    job["progress"] = f"{i+1}/{len(chunks)}"
                    save_job(job_id, job)
                
                # Merge all parts
                merge_audio_files(temp_files, out_wav)
            
            # Update status to completed
            job = load_job(job_id)
            job["status"] = "completed"
            job["completed_at"] = datetime.now().isoformat()
            job["audio_url"] = out_wav
            save_job(job_id, job)
            
        except Exception as e:
            job = load_job(job_id)
            job["status"] = "failed"
            job["error"] = str(e)
            job["failed_at"] = datetime.now().isoformat()
            save_job(job_id, job)
        
        finally:
            job_queue.task_done()

# Start worker thread
threading.Thread(target=worker, daemon=True).start()

def submit_job(user_id, voice_name, text, language="en"):
    """Submit TTS job - returns immediately"""
    job_id = str(uuid.uuid4())
    voice_clean = voice_name.lower().replace(" ", "_")
    speaker_wav = f"voices/{user_id}/{voice_clean}/ref.wav"
    
    if not os.path.exists(speaker_wav):
        raise FileNotFoundError(f"Voice not found: {voice_name}")
    
    out_dir = f"outputs/{user_id}/{voice_clean}"
    os.makedirs(out_dir, exist_ok=True)
    out_wav = f"{out_dir}/{job_id}.wav"
    
    job_data = {
        "job_id": job_id,
        "user_id": user_id,
        "voice_name": voice_name,
        "text": text,
        "text_length": len(text),
        "language": language,
        "status": "queued",
        "created_at": datetime.now().isoformat(),
        "speaker_wav": speaker_wav,
        "out_wav": out_wav
    }
    save_job(job_id, job_data)
    job_queue.put(job_data)
    
    return job_id

def get_job_status(job_id):
    job = load_job(job_id)
    if not job:
        return None
    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "progress": job.get("progress"),
        "created_at": job.get("created_at"),
        "started_at": job.get("started_at"),
        "completed_at": job.get("completed_at"),
        "audio_url": job.get("audio_url"),
        "error": job.get("error")
    }

def get_queue_size():
    return job_queue.qsize()
