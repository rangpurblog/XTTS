from TTS.api import TTS
import torch

class XTTSVoiceCloner:
    def __init__(self, device="cuda"):
        self.tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        self.tts = self.tts.to(device)
        self.device = device

    def generate(
        self,
        text: str,
        speaker_wav: str,
        out_path: str,
        language: str = "en"
    ):
        """Generate with better continuity"""
        
        # Use lower-level synthesizer for better control
        # This avoids internal sentence splitting
        self.tts.tts_to_file(
            text=text,
            speaker_wav=speaker_wav,
            language=language,
            file_path=out_path,
            split_sentences=False  # এটাই key!
        )
