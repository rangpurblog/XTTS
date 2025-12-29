import os
import uuid
import json
from TTS.api import TTS
from app.audio_utils import wav_to_mp3
from app.xtts_engine import XTTSVoiceCloner

# 🔥 Load XTTS once (GPU)
tts = TTS(
    model_name="tts_models/multilingual/multi-dataset/xtts_v2",
    gpu=True
)

# -------------------------
# ONE-TIME VOICE CLONE
# -------------------------
def clone_voice(user_id: str, ref_wav_path: str):
    voice_dir = f"voices/{user_id}"
    os.makedirs(voice_dir, exist_ok=True)

    final_ref = f"{voice_dir}/ref.wav"

    # overwrite allowed (re-clone)
    if ref_wav_path != final_ref:
        os.replace(ref_wav_path, final_ref)

    return {
        "status": "cloned",
        "voice_path": final_ref
    }


# -------------------------
# GENERATE TTS (REUSE VOICE)
# -------------------------
engine = XTTSVoiceCloner()

BASE_DIR = "voices"
OUTPUT_DIR = "outputs"

def generate_voice(
    user_id: str,
    voice_name: str,
    text: str,
    language: str = "en"
):
    voice_name = voice_name.lower().replace(" ", "_")

    ref_wav = os.path.join(
        BASE_DIR, user_id, voice_name, "ref.wav"
    )

    if not os.path.exists(ref_wav):
        raise FileNotFoundError("Voice not found")

    out_wav = os.path.join(
        OUTPUT_DIR, user_id, voice_name, "output.wav"
    )

    engine.generate(
        text=text,
        speaker_wav=ref_wav,
        out_path=out_wav,
        language=language
    )

    return out_wav

def set_voice_public(user_id: str, voice_name: str, public: bool):
    voice_dir = os.path.join(BASE_DIR, user_id, voice_name)
    meta_path = os.path.join(voice_dir, "meta.json")

    if not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="Voice not found")

    with open(meta_path, "r") as f:
        meta = json.load(f)

    meta["public"] = public

    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    return {
        "status": "updated",
        "voice_id": voice_name,
        "public": public
    }