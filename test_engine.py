from xtts_engine import XTTSVoiceCloner

engine = XTTSVoiceCloner(device="cuda")

engine.synthesize(
    text="This is a reusable XTTS engine.",
    speaker_wav="ref.wav",
    out_path="test.wav",
    language="en"
)

print("ENGINE TEST SUCCESS")
