from dotenv import load_dotenv
import json, os
load_dotenv()
from fastapi import FastAPI, UploadFile, Form, Depends
from app.xtts_engine import XTTSVoiceCloner
from fastapi.staticfiles import StaticFiles
from app.clone_voice import clone_voice
from app.voice_service import generate_voice, set_voice_public
from app.clone_voice import delete_voice
from app.utils import get_user_voices, get_public_voices
from app.admin_service import list_all_voices
from app.deps import admin_auth
from app.admin_service import admin_delete_voice
engine = XTTSVoiceCloner()
app = FastAPI()
# app.mount("/voices", StaticFiles(directory="voices"), name="voices")

@app.post("/clone-voice")
async def clone(
    audio: UploadFile,
    user_id: str = Form(...),
    voice_name: str = Form(...)
):
    return clone_voice(audio, user_id, voice_name)

@app.get("/voices/{user_id}")
def list_user_voices(user_id: str):
    voices = get_user_voices(user_id)

    return {
        "user_id": user_id,
        "voices": voices
    }

@app.post("/admin/voice-public")
def toggle_public(
    user_id: str = Form(...),
    voice_name: str = Form(...),
    public: bool = Form(...)
):
    return set_voice_public(user_id, voice_name, public)


@app.get("/admin/voices", dependencies=[Depends(admin_auth)])
def admin_list_voices():
    return {"voices": list_all_voices()}


@app.post("/admin/delete-voice", dependencies=[Depends(admin_auth)])
def delete_voice_admin(
    user_id: str = Form(...),
    voice_id: str = Form(...)
):
    return admin_delete_voice(user_id, voice_id)

@app.get("/voices/public")
def list_public_voices():
    return {
        "voices": get_public_voices()
    }



@app.post("/delete-voice")
async def delete_voice_api(
    user_id: str = Form(...),
    voice_name: str = Form(...)
):
    return await delete_voice(
        user_id=user_id,
        voice_name=voice_name
    )

@app.post("/tts")
async def tts(
    user_id: str = Form(...),
    voice_name: str = Form(...),
    text: str = Form(...),
    language: str = Form("en")
):
    out = generate_voice(
        user_id=user_id,
        voice_name=voice_name,
        text=text,
        language=language
    )

    return {
        "status": "success",
        "output": out
    }


@app.post("/admin/tts", dependencies=[Depends(admin_auth)])
def admin_tts(
    user_id: str = Form(...),
    voice_id: str = Form(...),
    text: str = Form(...)
):
    ref = f"voices/{user_id}/{voice_id}/ref.wav"
    out = f"outputs/admin_test/{user_id}_{voice_id}.wav"

    engine.generate(text, ref, out)

    return {"audio_url": out}


@app.get("/admin/stats", dependencies=[Depends(admin_auth)])
def admin_stats():
    users = set()
    voices = 0
    public = 0

    if not os.path.exists("voices"):
        return {
            "users": 0,
            "voices": 0,
            "public_voices": 0
        }

    for u in os.listdir("voices"):
        user_path = os.path.join("voices", u)

        # ✅ skip files
        if not os.path.isdir(user_path):
            continue

        users.add(u)

        for v in os.listdir(user_path):
            voice_path = os.path.join(user_path, v)

            # ✅ skip non-directories
            if not os.path.isdir(voice_path):
                continue

            voices += 1

            meta = os.path.join(voice_path, "meta.json")
            if os.path.exists(meta):
                with open(meta) as f:
                    if json.load(f).get("public"):
                        public += 1

    return {
        "users": len(users),
        "voices": voices,
        "public_voices": public
    }

