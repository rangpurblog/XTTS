from pydub import AudioSegment
import os
import json

BASE_DIR = "voices"

def wav_to_mp3(wav_path: str) -> str:
    if not wav_path.endswith(".wav"):
        raise ValueError("Input must be a WAV file")

    mp3_path = wav_path.replace(".wav", ".mp3")

    audio = AudioSegment.from_wav(wav_path)
    audio.export(mp3_path, format="mp3")

    return mp3_path


def get_user_voices(user_id: str):
    user_dir = os.path.join(BASE_DIR, user_id)

    if not os.path.exists(user_dir):
        return []

    voices = []

    for voice_id in os.listdir(user_dir):
        voice_dir = os.path.join(user_dir, voice_id)
        meta_path = os.path.join(voice_dir, "meta.json")
        ref_path = os.path.join(voice_dir, "ref.wav")

        if not os.path.exists(meta_path):
            continue

        with open(meta_path, "r") as f:
            meta = json.load(f)

        voices.append({
            "voice_id": voice_id,
            "display_name": meta.get(
                "voice_name",
                voice_id.replace("_", " ").title()
            ),
            "public": meta.get("public", False),
            "audio_url": f"/voices/{user_id}/{voice_id}/ref.wav"
        })

    return voices
