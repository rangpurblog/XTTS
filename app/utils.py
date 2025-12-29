from pydub import AudioSegment
import os

def wav_to_mp3(wav_path: str) -> str:
    if not wav_path.endswith(".wav"):
        raise ValueError("Input must be a WAV file")

    mp3_path = wav_path.replace(".wav", ".mp3")

    audio = AudioSegment.from_wav(wav_path)
    audio.export(mp3_path, format="mp3")

    return mp3_path
