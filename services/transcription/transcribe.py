#!/usr/bin/env python3
"""Транскрибация аудио/видео через faster-whisper.

Использование:
    python3 transcribe.py --input audio.mp3 [--model large-v2] [--language ru] [--device auto]

Результат — JSON в stdout:
    {"language": "ru", "duration": 123.4, "text": "...", "segments": [{"start", "end", "text"}]}

Прогресс пишется в stderr строками вида "PROGRESS:42".
"""

import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description="Transcribe audio/video with faster-whisper")
    parser.add_argument("--input", required=True, help="Путь к аудио/видео файлу")
    parser.add_argument("--model", default="large-v2", help="Модель Whisper")
    parser.add_argument("--language", default=None, help="Язык записи (ISO 639-1), иначе автоопределение")
    parser.add_argument("--device", default="auto", help="cpu | cuda | auto")
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("faster-whisper не установлен: pip install -r requirements.txt", file=sys.stderr)
        return 2

    compute_type = "int8" if args.device == "cpu" else "auto"
    model = WhisperModel(args.model, device=args.device, compute_type=compute_type)

    segments_iter, info = model.transcribe(
        args.input,
        language=args.language,
        vad_filter=True,
        beam_size=5,
    )

    duration = info.duration or 0.0
    segments = []
    last_progress = -1

    for segment in segments_iter:
        segments.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
        })
        if duration > 0:
            progress = int(min(99, segment.end / duration * 100))
            if progress > last_progress:
                last_progress = progress
                print(f"PROGRESS:{progress}", file=sys.stderr, flush=True)

    result = {
        "language": info.language or (args.language or "unknown"),
        "duration": round(duration, 2),
        "text": "\n".join(s["text"] for s in segments),
        "segments": segments,
    }

    json.dump(result, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
