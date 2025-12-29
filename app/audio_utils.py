from pydub import AudioSegment
import os
import uuid

def normalize_to_wav(input_path: str) -> str:
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1).set_frame_rate(22050)

    out_path = input_path.replace(".mp3", ".wav")
    audio.export(out_path, format="wav")
    return out_path


def wav_to_mp3(wav_path: str) -> str:
    mp3_path = wav_path.replace(".wav", ".mp3")
    AudioSegment.from_wav(wav_path).export(mp3_path, format="mp3")
    return mp3_path


def convert_to_wav(input_path: str) -> str:
    if input_path.endswith(".wav"):
        return input_path

    wav_path = input_path.rsplit(".", 1)[0] + ".wav"
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1).set_frame_rate(22050)
    audio.export(wav_path, format="wav")
    return wav_path

