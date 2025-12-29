from TTS.api import TTS

class XTTSVoiceCloner:
    def __init__(self, device="cuda"):
        self.tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        self.tts = self.tts.to(device)

    def synthesize(
        self,
        text: str,
        speaker_wav: str,
        out_path: str,
        language: str = "en"
    ):
        self.tts.tts_to_file(
            text=text,
            speaker_wav=speaker_wav,
            language=language,
            file_path=out_path
        )
