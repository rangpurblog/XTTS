from TTS.api import TTS

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
tts = tts.to("cuda")

tts.tts_to_file(
    text="This is the final GPU test of my XTTS v2 voice cloning system.",
    speaker_wav=r"C:\Users\rasel\XTTS\ref.wav",
    language="en",
    file_path="output.wav"
)

print("SUCCESS: XTTS v2 GPU output.wav generated")
