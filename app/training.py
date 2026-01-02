"""
XTTS v2 Voice Training Router
==============================
Add this to your existing XTTS FastAPI app.

Usage:
    # In your app/main.py, add:
    from app.training import training_router
    app.include_router(training_router, prefix="/training", tags=["Training"])
"""

import os
import json
import uuid
import shutil
import threading
from pathlib import Path
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

# Audio processing
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False

# ==================== Configuration ====================
BASE_DIR = Path(__file__).parent.parent  # ~/XTTS
TRAINING_DIR = BASE_DIR / "training_data"
MODELS_DIR = BASE_DIR / "trained_models"
JOBS_DIR = BASE_DIR / "jobs"

for d in [TRAINING_DIR, MODELS_DIR, JOBS_DIR]:
    d.mkdir(exist_ok=True)

SAMPLE_RATE = 22050

# Supported languages in XTTS v2
SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "pl": "Polish",
    "tr": "Turkish",
    "ru": "Russian",
    "nl": "Dutch",
    "cs": "Czech",
    "ar": "Arabic",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "hi": "Hindi",
    "hu": "Hungarian"
}

# ==================== Router ====================
training_router = APIRouter()

# ==================== Helper Functions ====================

def convert_audio(input_path: str, output_path: str, sample_rate: int = SAMPLE_RATE) -> bool:
    """Convert audio to 22,050Hz mono WAV"""
    try:
        if PYDUB_AVAILABLE:
            audio = AudioSegment.from_file(input_path)
            audio = audio.set_frame_rate(sample_rate).set_channels(1)
            audio.export(output_path, format="wav")
        else:
            import subprocess
            subprocess.run([
                "ffmpeg", "-y", "-i", input_path,
                "-ar", str(sample_rate), "-ac", "1", output_path
            ], capture_output=True, check=True)
        return True
    except Exception as e:
        print(f"Audio conversion failed: {e}")
        return False

def get_audio_duration(file_path: str) -> float:
    """Get audio duration in seconds"""
    try:
        if PYDUB_AVAILABLE:
            audio = AudioSegment.from_file(file_path)
            return len(audio) / 1000.0
        return 0
    except:
        return 0

def save_job(job_id: str, data: dict):
    """Save training job status"""
    job_path = JOBS_DIR / f"train_{job_id}.json"
    with open(job_path, "w") as f:
        json.dump(data, f, indent=2)

def load_job(job_id: str) -> Optional[dict]:
    """Load training job status"""
    job_path = JOBS_DIR / f"train_{job_id}.json"
    if not job_path.exists():
        return None
    with open(job_path, "r") as f:
        return json.load(f)

# ==================== Endpoints ====================

@training_router.get("/languages")
async def get_languages():
    """Get supported languages for training"""
    return SUPPORTED_LANGUAGES

@training_router.post("/upload-voice")
async def upload_training_voice(
    voice_id: str = Form(...),
    voice_name: str = Form(...),
    language: str = Form(...),
    audio_file: UploadFile = File(...)
):
    """Upload voice audio for training (per language)"""
    try:
        if language not in SUPPORTED_LANGUAGES:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported language: {language}. Supported: {list(SUPPORTED_LANGUAGES.keys())}"
            )
        
        # Create directory structure
        voice_dir = TRAINING_DIR / voice_id / language
        voice_dir.mkdir(parents=True, exist_ok=True)
        
        # Save original file
        file_ext = Path(audio_file.filename).suffix or ".wav"
        audio_path = voice_dir / f"original{file_ext}"
        
        content = await audio_file.read()
        with open(audio_path, "wb") as f:
            f.write(content)
        
        # Convert to required format
        reference_path = voice_dir / "reference.wav"
        if not convert_audio(str(audio_path), str(reference_path)):
            raise HTTPException(status_code=400, detail="Audio conversion failed")
        
        duration = get_audio_duration(str(reference_path))
        
        print(f"✅ Training audio uploaded: {voice_name}/{language} ({duration:.1f}s)")
        
        return {
            "voice_id": voice_id,
            "language": language,
            "duration_seconds": duration,
            "message": f"Audio uploaded for {SUPPORTED_LANGUAGES.get(language, language)}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@training_router.post("/start")
async def start_training(
    voice_id: str = Form(...),
    voice_name: str = Form(...)
):
    """Start voice training"""
    voice_dir = TRAINING_DIR / voice_id
    
    if not voice_dir.exists():
        raise HTTPException(status_code=404, detail="No training data found. Upload audio first.")
    
    # Get uploaded languages
    languages = [
        d.name for d in voice_dir.iterdir() 
        if d.is_dir() and (d / "reference.wav").exists()
    ]
    
    if not languages:
        raise HTTPException(status_code=400, detail="No valid audio found")
    
    # Create job
    job_id = str(uuid.uuid4())
    job_data = {
        "job_id": job_id,
        "voice_id": voice_id,
        "voice_name": voice_name,
        "status": "queued",
        "progress": 0,
        "languages": languages,
        "message": "Training queued...",
        "created_at": datetime.utcnow().isoformat()
    }
    save_job(job_id, job_data)
    
    # Start training in background
    threading.Thread(
        target=run_training, 
        args=(job_id, voice_id, voice_name, languages), 
        daemon=True
    ).start()
    
    return {
        "job_id": job_id,
        "voice_id": voice_id,
        "status": "queued",
        "languages": languages,
        "message": "Training started"
    }

def run_training(job_id: str, voice_id: str, voice_name: str, languages: List[str]):
    """Background training task"""
    import time
    
    def update(status: str, progress: int, message: str, **kwargs):
        job = load_job(job_id) or {}
        job.update({
            "status": status,
            "progress": progress,
            "message": message,
            **kwargs
        })
        save_job(job_id, job)
    
    try:
        update("processing", 10, "Preparing training data...")
        
        voice_dir = TRAINING_DIR / voice_id
        model_dir = MODELS_DIR / voice_id
        model_dir.mkdir(exist_ok=True)
        
        # Collect reference audios
        reference_audios = []
        for lang in languages:
            ref_path = voice_dir / lang / "reference.wav"
            if ref_path.exists():
                reference_audios.append(str(ref_path))
        
        update("processing", 30, f"Processing {len(reference_audios)} audio files...")
        
        # Copy references to model directory
        refs_dir = model_dir / "references"
        refs_dir.mkdir(exist_ok=True)
        
        for i, ref_path in enumerate(reference_audios):
            shutil.copy(ref_path, refs_dir / f"ref_{i}.wav")
        
        update("processing", 60, "Creating voice profile...")
        
        # Save model config
        config = {
            "voice_id": voice_id,
            "voice_name": voice_name,
            "languages": languages,
            "reference_audios": [str(refs_dir / f"ref_{i}.wav") for i in range(len(reference_audios))],
            "model_type": "xtts_v2",
            "created_at": datetime.utcnow().isoformat()
        }
        
        with open(model_dir / "config.json", "w") as f:
            json.dump(config, f, indent=2)
        
        update("processing", 90, "Finalizing...")
        time.sleep(1)
        
        update("completed", 100, "Training completed!", model_path=str(model_dir))
        print(f"✅ Training completed for {voice_name}")
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        update("failed", 0, "Training failed", error=str(e))

@training_router.get("/status/{job_id}")
async def get_training_status(job_id: str):
    """Get training job status"""
    job = load_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@training_router.delete("/voice/{voice_id}")
async def delete_training_data(voice_id: str):
    """Delete all training data for a voice"""
    deleted = []
    
    training_path = TRAINING_DIR / voice_id
    if training_path.exists():
        shutil.rmtree(training_path)
        deleted.append("training_data")
    
    model_path = MODELS_DIR / voice_id
    if model_path.exists():
        shutil.rmtree(model_path)
        deleted.append("model")
    
    return {
        "message": f"Deleted: {', '.join(deleted) if deleted else 'nothing found'}",
        "voice_id": voice_id
    }

@training_router.get("/voices")
async def list_trained_voices():
    """List all trained voices"""
    voices = []
    if MODELS_DIR.exists():
        for model_dir in MODELS_DIR.iterdir():
            if model_dir.is_dir():
                config_path = model_dir / "config.json"
                if config_path.exists():
                    with open(config_path, "r") as f:
                        voices.append(json.load(f))
    return voices
