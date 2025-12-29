from xtts_engine import XTTSVoiceCloner

engine = XTTSVoiceCloner(device="cuda")

output = engine.generate(
    text="This is my cloned voice speaking clearly.",
    speaker_wav="ref.wav",
    out_path="output.wav",
    language="en"
)

print("SUCCESS:", output)
