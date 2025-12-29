from fastapi import FastAPI, UploadFile, Form
from app.clone_voice import clone_voice
from app.voice_service import generate_voice


app = FastAPI()

@app.post("/clone-voice")
async def clone(
    audio: UploadFile,
    user_id: str = Form(...),
    voice_name: str = Form(...)
):
    return clone_voice(audio, user_id, voice_name)



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