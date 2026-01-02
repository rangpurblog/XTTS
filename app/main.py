from dotenv import load_dotenv
import json, os
load_dotenv()
from fastapi import FastAPI, UploadFile, Form, Depends, HTTPException
from app.training import training_router
from fastapi.staticfiles import StaticFiles
from app.clone_voice import clone_voice, delete_voice
from app.voice_service import set_voice_public
from app.utils import get_user_voices, get_public_voices
from app.admin_service import list_all_voices, admin_delete_voice
from app.deps import admin_auth
from app.job_manager import submit_job, get_job_status, get_queue_size

app = FastAPI()

app.include_router(training_router, prefix="/training", tags=["Training"])
# Serve output audio files
os.makedirs("outputs", exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

@app.post("/clone-voice")
async def clone(audio: UploadFile, user_id: str = Form(...), voice_name: str = Form(...)):
    return clone_voice(audio, user_id, voice_name)

@app.get("/voices/{user_id}")
def list_user_voices(user_id: str):
    return {"user_id": user_id, "voices": get_user_voices(user_id)}

@app.get("/voices/public")
def list_public():
    return {"voices": get_public_voices()}

@app.post("/delete-voice")
async def del_voice(user_id: str = Form(...), voice_name: str = Form(...)):
    return await delete_voice(user_id=user_id, voice_name=voice_name)

# ============ ASYNC TTS ============

@app.post("/tts")
async def tts_submit(
    user_id: str = Form(...), 
    voice_name: str = Form(...), 
    text: str = Form(...), 
    language: str = Form("en")
):
    """Submit TTS job - returns job_id immediately"""
    # Limit check
    if len(text) > 30000:
        raise HTTPException(status_code=400, detail="Text too long. Max 30000 characters.")
    
    try:
        job_id = submit_job(user_id, voice_name, text, language)
        return {
            "status": "queued",
            "job_id": job_id,
            "queue_size": get_queue_size(),
            "message": "Job submitted. Poll /tts/status/{job_id} for progress."
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tts/status/{job_id}")
def tts_status(job_id: str):
    """Check TTS job status"""
    status = get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    resp = {
        "job_id": status["job_id"],
        "status": status["status"],
        "progress": status.get("progress"),
        "created_at": status["created_at"]
    }
    
    if status["status"] == "queued":
        resp["queue_position"] = get_queue_size()
        resp["message"] = "Waiting in queue..."
    elif status["status"] == "processing":
        resp["started_at"] = status["started_at"]
        resp["message"] = f"Generating... {status.get('progress', '')}"
    elif status["status"] == "completed":
        resp["completed_at"] = status["completed_at"]
        resp["audio_url"] = f"/outputs/{status['audio_url'].replace('outputs/', '')}"
        resp["message"] = "Audio ready!"
    elif status["status"] == "failed":
        resp["error"] = status["error"]
        resp["message"] = "Generation failed"
    
    return resp

# ============ ADMIN ============

@app.post("/admin/voice-public")
def toggle_public(user_id: str = Form(...), voice_name: str = Form(...), public: bool = Form(...)):
    return set_voice_public(user_id, voice_name, public)

@app.get("/admin/voices", dependencies=[Depends(admin_auth)])
def admin_voices():
    return {"voices": list_all_voices()}

@app.post("/admin/delete-voice", dependencies=[Depends(admin_auth)])
def admin_del(user_id: str = Form(...), voice_id: str = Form(...)):
    return admin_delete_voice(user_id, voice_id)

@app.get("/admin/stats", dependencies=[Depends(admin_auth)])
def admin_stats():
    users, voices, public = set(), 0, 0
    if os.path.exists("voices"):
        for u in os.listdir("voices"):
            up = os.path.join("voices", u)
            if not os.path.isdir(up): continue
            users.add(u)
            for v in os.listdir(up):
                vp = os.path.join(up, v)
                if not os.path.isdir(vp): continue
                voices += 1
                meta = os.path.join(vp, "meta.json")
                if os.path.exists(meta):
                    with open(meta) as f:
                        if json.load(f).get("public"): public += 1
    
    return {
        "users": len(users),
        "voices": voices,
        "public_voices": public,
        "queue_size": get_queue_size()
    }
