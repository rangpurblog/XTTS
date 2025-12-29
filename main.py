from fastapi import FastAPI, UploadFile, Form
from voice_service import save_reference_voice
from queue import submit_tts_job

app = FastAPI()

@app.post("/voice/clone")
async def clone_voice(
    user_id: str = Form(...),
    file: UploadFile = Form(...)
):
    path = f"temp/{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())

    ref = save_reference_voice(user_id, path)
    return {"status": "ok", "ref_voice": ref}


@app.post("/tts")
def tts_generate(
    user_id: str,
    text: str,
    voice_owner: str = None
):
    job_id = submit_tts_job(user_id, text, voice_owner)
    return {"job_id": job_id}
