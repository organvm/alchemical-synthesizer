#!/usr/bin/env python3
"""Generate a short test-tone WAV using only the standard library.

Used by tools/smoke.sh to give the audio validator a self-contained,
guaranteed-viable specimen (no committed binary assets required).

Usage:
    python3 tools/gen_test_tone.py [output.wav] [--freq 440] [--seconds 0.5]
"""

import argparse
import math
import struct
import wave


def generate(path: str, freq: float = 440.0, seconds: float = 0.5,
             rate: int = 44100, amplitude: float = 0.7) -> None:
    n = int(rate * seconds)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(rate)
        frames = bytearray()
        for i in range(n):
            # Sine plus a touch of a third harmonic so the amplitude
            # histogram spreads across enough bins to pass the diversity check.
            t = i / rate
            sample = amplitude * (
                0.8 * math.sin(2 * math.pi * freq * t)
                + 0.2 * math.sin(2 * math.pi * freq * 3 * t)
            )
            frames += struct.pack("<h", int(max(-1.0, min(1.0, sample)) * 32767))
        wf.writeframes(bytes(frames))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a test-tone WAV")
    parser.add_argument("output", nargs="?", default="test_tone.wav")
    parser.add_argument("--freq", type=float, default=440.0)
    parser.add_argument("--seconds", type=float, default=0.5)
    args = parser.parse_args()
    generate(args.output, args.freq, args.seconds)
    print(f"Wrote {args.output} ({args.freq} Hz, {args.seconds}s)")
