from fastapi import FastAPI, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from app.clone_voice import clone_voice
from app.voice_service import generate_voice
from app.clone_voice import delete_voice
from app.utils import get_user_voices

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