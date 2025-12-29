import os
from TTS.api import TTS

class XTTSVoiceCloner:
    def __init__(self):
        self.tts = TTS(
            "tts_models/multilingual/multi-dataset/xtts_v2",
            gpu=True
        )

    def generate(
        self,
        text: str,
        speaker_wav: str,
        out_path: str,
        language: str = "en"
    ):
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        self.tts.tts_to_file(
            text=text,
            speaker_wav=speaker_wav,
            language=language,
            file_path=out_path
        )

        return out_path
