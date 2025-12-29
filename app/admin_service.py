import os, json
import shutil
from fastapi import HTTPException

BASE_DIR = "voices"

def list_all_voices():
    voices = []

    for user_id in os.listdir(BASE_DIR):
        user_dir = os.path.join(BASE_DIR, user_id)
        if not os.path.isdir(user_dir):
            continue

        for voice_id in os.listdir(user_dir):
            meta_path = os.path.join(user_dir, voice_id, "meta.json")
            if not os.path.exists(meta_path):
                continue

            with open(meta_path) as f:
                meta = json.load(f)

            voices.append({
                "user_id": user_id,
                "voice_id": voice_id,
                "public": meta.get("public", False),
                "audio_url": f"/voices/{user_id}/{voice_id}/ref.wav"
            })

    return voices


def admin_delete_voice(user_id: str, voice_id: str):
    voice_dir = os.path.join("voices", user_id, voice_id)

    if not os.path.exists(voice_dir):
        raise HTTPException(404, "Voice not found")

    shutil.rmtree(voice_dir)

    return {
        "status": "deleted",
        "user_id": user_id,
        "voice_id": voice_id
    }