#!/usr/bin/env python
"""
Generate short sound effects with AudioLDM2 and optionally export runtime OGG assets.

Usage examples:
  .\.venv-audio311\Scripts\python scripts\generate_audioldm2_sfx.py --profile the-call --sound door_creak
  .\.venv-audio311\Scripts\python scripts\generate_audioldm2_sfx.py --profile the-call --all
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import scipy.io.wavfile
import torch
from diffusers import AudioLDM2Pipeline
from huggingface_hub import snapshot_download
from huggingface_hub.errors import LocalEntryNotFoundError


MODEL_ID = "cvssp/audioldm2"
PATCHED_MODEL_DIR = Path(".tmp_models/audioldm2_patched")
TEMP_AUDIO_DIR = Path(".tmp_audio_tests")


@dataclass(frozen=True)
class SoundPreset:
    prompt: str
    length_seconds: float


PRESETS: dict[str, dict[str, SoundPreset]] = {
    "the-call": {
        "door_creak": SoundPreset(
            prompt=(
                "realistic isolated wooden door creak sound effect, quiet room, short natural hinge movement, "
                "no music, no voice, no ambience wash, one-shot foley"
            ),
            length_seconds=3.0,
        ),
        "footsteps": SoundPreset(
            prompt=(
                "realistic isolated slow footsteps in an empty office corridor, subtle shoe steps, tense atmosphere, "
                "no music, no voice, one-shot foley sequence"
            ),
            length_seconds=4.0,
        ),
        "heavy_breathing": SoundPreset(
            prompt=(
                "realistic isolated anxious heavy breathing sound effect, close human breath, tense but controlled, "
                "no music, no voice, no reverb wash, one-shot foley"
            ),
            length_seconds=4.0,
        ),
        "door_slam": SoundPreset(
            prompt=(
                "realistic isolated heavy door slam sound effect in an empty office hallway, sharp impact, "
                "short tense room resonance, no music, no voice, one-shot foley"
            ),
            length_seconds=3.0,
        ),
        "pickup_click": SoundPreset(
            prompt=(
                "realistic isolated phone handset pickup click sound effect, close tactile plastic receiver sound, "
                "short clean transient, no music, no voice, one-shot foley"
            ),
            length_seconds=2.0,
        ),
        "keypad_beep": SoundPreset(
            prompt=(
                "realistic isolated keypad button beep sound effect, close electronic security keypad press, "
                "clean short confirmation tone, no music, no voice, one-shot ui foley"
            ),
            length_seconds=2.0,
        ),
        "disconnect_tone": SoundPreset(
            prompt=(
                "realistic isolated phone disconnect tone sound effect, restrained telecom ending tone, clean and "
                "short, no music, no voice, one-shot electronic foley"
            ),
            length_seconds=3.0,
        ),
        "water_drip": SoundPreset(
            prompt=(
                "realistic isolated water drip in a quiet industrial room, sparse droplets, dark tense space, "
                "no music, no voice, one-shot ambient foley"
            ),
            length_seconds=4.0,
        ),
        "metal_scrape": SoundPreset(
            prompt=(
                "realistic isolated metal scrape sound effect, restrained industrial friction, short tense movement, "
                "no music, no voice, one-shot foley"
            ),
            length_seconds=3.0,
        ),
        "pipe_clank": SoundPreset(
            prompt=(
                "realistic isolated pipe clank sound effect in an empty industrial room, short metallic resonance, "
                "no music, no voice, one-shot foley"
            ),
            length_seconds=3.0,
        ),
    }
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", required=True, choices=sorted(PRESETS))
    parser.add_argument("--sound", action="append", dest="sounds", default=[])
    parser.add_argument("--all", action="store_true", help="Generate all presets for the selected profile.")
    parser.add_argument("--steps", type=int, default=12)
    parser.add_argument("--guidance-scale", type=float, default=3.5)
    parser.add_argument("--skip-ogg", action="store_true", help="Do not encode public OGG assets.")
    return parser.parse_args()


def resolve_ffmpeg() -> str | None:
    localappdata = os.environ.get("LOCALAPPDATA")
    if not localappdata:
        return shutil.which("ffmpeg")
    winget_ffmpeg = Path(localappdata) / "Microsoft" / "WinGet" / "Links" / "ffmpeg.exe"
    if winget_ffmpeg.exists():
        return str(winget_ffmpeg)
    return shutil.which("ffmpeg")


def ensure_patched_model_dir() -> Path:
    try:
        snapshot_dir = Path(snapshot_download(MODEL_ID, local_files_only=True))
        print(f"using_cached_snapshot={snapshot_dir}")
    except LocalEntryNotFoundError:
        snapshot_dir = Path(snapshot_download(MODEL_ID))
        print(f"downloaded_snapshot={snapshot_dir}")

    PATCHED_MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)
    if PATCHED_MODEL_DIR.exists():
        shutil.rmtree(PATCHED_MODEL_DIR)
    shutil.copytree(snapshot_dir, PATCHED_MODEL_DIR)

    model_index_path = PATCHED_MODEL_DIR / "model_index.json"
    data = json.loads(model_index_path.read_text(encoding="utf-8"))
    data["language_model"] = ["transformers", "GPT2LMHeadModel"]
    model_index_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return PATCHED_MODEL_DIR


def build_pipeline(model_dir: Path) -> AudioLDM2Pipeline:
    use_cuda = torch.cuda.is_available()
    dtype = torch.float16 if use_cuda else torch.float32
    pipe = AudioLDM2Pipeline.from_pretrained(str(model_dir), torch_dtype=dtype)
    if use_cuda:
        pipe = pipe.to("cuda")
    return pipe


def encode_ogg(ffmpeg_path: str, wav_path: Path, ogg_path: Path) -> None:
    ogg_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [ffmpeg_path, "-y", "-i", str(wav_path), "-c:a", "libvorbis", "-q:a", "5", str(ogg_path)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main() -> int:
    args = parse_args()
    sounds = sorted(PRESETS[args.profile]) if args.all else args.sounds
    if not sounds:
        print("No sounds requested. Use --sound or --all.", file=sys.stderr)
        return 2

    unknown = [sound for sound in sounds if sound not in PRESETS[args.profile]]
    if unknown:
        print(f"Unknown sounds for profile {args.profile}: {', '.join(unknown)}", file=sys.stderr)
        return 2

    ffmpeg_path = None if args.skip_ogg else resolve_ffmpeg()
    if not args.skip_ogg and not ffmpeg_path:
        print("ffmpeg not found; rerun with --skip-ogg or install ffmpeg.", file=sys.stderr)
        return 2

    print(f"torch={torch.__version__} cuda={torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"device={torch.cuda.get_device_name(0)}")

    model_dir = ensure_patched_model_dir()
    print(f"patched_model_dir={model_dir}")
    pipe = build_pipeline(model_dir)

    temp_dir = TEMP_AUDIO_DIR / args.profile.replace("-", "_")
    public_dir = Path("public") / "sounds" / "stories" / args.profile / "sfx"
    temp_dir.mkdir(parents=True, exist_ok=True)

    for sound in sounds:
        preset = PRESETS[args.profile][sound]
        started = time.time()
        result = pipe(
            preset.prompt,
            num_inference_steps=args.steps,
            audio_length_in_s=preset.length_seconds,
            guidance_scale=args.guidance_scale,
        )
        wav_path = temp_dir / f"{sound}.wav"
        scipy.io.wavfile.write(wav_path, rate=16000, data=result.audios[0])
        print(f"generated {sound} wav={wav_path} seconds={preset.length_seconds} elapsed={time.time() - started:.2f}")

        if ffmpeg_path:
            ogg_path = public_dir / f"{sound}.ogg"
            encode_ogg(ffmpeg_path, wav_path, ogg_path)
            print(f"encoded {sound} ogg={ogg_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
