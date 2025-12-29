import queue
import threading
import uuid
from voice_service import engine, wav_to_mp3

job_queue = queue.Queue()

def worker():
    while True:
        job = job_queue.get()
        try:
            engine.generate(**job)
        finally:
            job_queue.task_done()

threading.Thread(target=worker, daemon=True).start()

def submit_tts_job(user_id, text, voice_owner=None):
    job_id = str(uuid.uuid4())

    speaker = (
        f"voices/{voice_owner}/ref_clean.wav"
        if voice_owner else
        f"voices/{user_id}/ref_clean.wav"
    )

    out_wav = f"outputs/{user_id}/{job_id}.wav"

    job_queue.put({
        "text": text,
        "speaker_wav": speaker,
        "out_path": out_wav,
        "language": "en"
    })

    return job_id
