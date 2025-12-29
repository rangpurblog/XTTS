import os
import shutil
from fastapi import UploadFile, HTTPException
from app.audio_utils import convert_to_wav

BASE_DIR = "voices"

def clone_voice(audio: UploadFile, user_id: str, voice_name: str):
    voice_name = voice_name.lower().replace(" ", "_")

    user_dir = os.path.join(BASE_DIR, user_id)
    voice_dir = os.path.join(user_dir, voice_name)

    os.makedirs(voice_dir, exist_ok=True)

    # save original upload
    original_path = os.path.join(voice_dir, audio.filename)
    with open(original_path, "wb") as f:
        shutil.copyfileobj(audio.file, f)

    # convert to wav
    ref_wav_path = convert_to_wav(original_path)

    # rename to ref.wav (XTTS expects this)
    final_ref = os.path.join(voice_dir, "ref.wav")
    os.replace(ref_wav_path, final_ref)

    # save metadata
    meta = {
        "user_id": user_id,
        "voice_name": voice_name,
        "ref_wav": final_ref,
        "public": False
    }

    import json
    with open(os.path.join(voice_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    return {
        "status": "cloned",
        "voice_id": voice_name,
        "voice_path": final_ref
    }


async def delete_voice(user_id: str, voice_name: str):
    voice_name = voice_name.lower().replace(" ", "_")  # ⭐ FIX
    voice_dir = os.path.join(BASE_DIR, user_id, voice_name)

    if not os.path.exists(voice_dir):
        raise HTTPException(
            status_code=404,
            detail="Voice not found"
        )

    # 🔥 Delete full voice folder
    shutil.rmtree(voice_dir)

    return {
        "status": "deleted",
        "voice_name": voice_name
    }