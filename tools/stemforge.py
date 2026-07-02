#!/usr/bin/env python3
"""stemforge.py — Per-stem modular render: each stolen stem -> its own creature.

Where tools/bounce.sh bounces ONE premix through a single voice, this renders
EACH stem of a forge recipe through its OWN Brahma creature-voice and sums them
under a master limiter. This is the "supremely powerful modular synth" made
literal: steal the drums from song A and the melody from song B, and each part
gets re-expressed by a different organ of the machine.

    drums  -> ossuary   (resonant percussive relic)
    bass   -> mnemosyne (tape wow/flutter + saturation)
    vocals -> chrysalid (granular morph)
    other  -> prima     (clean lead + octave shimmer)   [aka --melody]
    (opt)  -> janiform  (forward/reverse duality)

It reads a recipe produced by tools/forge.sh (forge/recipes/<name>/recipe.json),
normalizes each stem to stereo 44.1k WAV, and drives brahma/sc/14_stem_voices.scd
headless (scsynth -N). Writes <out> and <out>.manifest.json (provenance: which
song each stem came from, and which voice re-expressed it).

  Usage:
    tools/stemforge.py <recipe.json | recipe-name> --out out/heist.wav [--dur N]
        [--map drums=ossuary,other=prima,bass=mnemosyne,vocals=chrysalid]

Exit codes:  0 ok · 2 usage/input error · 3 SuperCollider or ffmpeg missing
Stdlib-only (no numpy/torch); safe on Python 3.14.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RENDERER = os.path.join(ROOT, "brahma", "sc", "14_stem_voices.scd")

# stem -> default creature-voice. --map overrides any of these.
DEFAULT_MAP = {
    "drums": "ossuary",
    "bass": "mnemosyne",
    "vocals": "chrysalid",
    "other": "prima",
}
# stem -> default level in the mix (transients loudest, texture softer).
DEFAULT_AMP = {"drums": 0.9, "bass": 0.8, "vocals": 0.72, "other": 0.85}
DEFAULT_AMP_FALLBACK = 0.8

VOICES = {"mnemosyne", "ossuary", "chrysalid", "prima", "janiform"}

# stem name order = render/mix order (also the order forge.sh writes them).
STEM_ORDER = ("drums", "bass", "vocals", "other")

# macOS app-bundle + common PATHs, mirroring tools/bounce.sh.
SCLANG_CANDIDATES = [
    "/Applications/SuperCollider/SuperCollider.app/Contents/MacOS/sclang",
    "/Applications/SuperCollider.app/Contents/MacOS/sclang",
    "/usr/local/bin/sclang",
    "/opt/homebrew/bin/sclang",
]
SCSYNTH_CANDIDATES = [
    "/Applications/SuperCollider/SuperCollider.app/Contents/Resources/scsynth",
    "/Applications/SuperCollider.app/Contents/Resources/scsynth",
    "/usr/local/bin/scsynth",
    "/opt/homebrew/bin/scsynth",
]


def die(msg: str, code: int = 2) -> None:
    print(f"stemforge: {msg}", file=sys.stderr)
    sys.exit(code)


def find_bin(name: str, candidates: list[str]) -> str | None:
    found = shutil.which(name)
    if found:
        return found
    for c in candidates:
        if os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    return None


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def sc_str(s: str) -> str:
    """A SuperCollider double-quoted string literal (JSON escaping is compatible)."""
    return json.dumps(s)


def probe_duration(ffprobe: str, path: str) -> float | None:
    try:
        out = subprocess.run(
            [ffprobe, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nk=1:nw=1", path],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return float(out) if out else None
    except (subprocess.CalledProcessError, ValueError):
        return None


def parse_map(spec: str | None) -> dict[str, str]:
    m = dict(DEFAULT_MAP)
    if not spec:
        return m
    for pair in spec.split(","):
        pair = pair.strip()
        if not pair:
            continue
        if "=" not in pair:
            die(f"bad --map entry (want stem=voice): {pair!r}")
        stem, voice = (x.strip() for x in pair.split("=", 1))
        if voice not in VOICES:
            die(f"unknown voice {voice!r} (choose from: {', '.join(sorted(VOICES))})")
        m[stem] = voice
    return m


def resolve_recipe(arg: str) -> tuple[str, dict]:
    """Accept a path to recipe.json, a recipe dir, or a bare recipe name."""
    candidates = [arg]
    if not arg.endswith(".json"):
        candidates.append(os.path.join(arg, "recipe.json"))
        candidates.append(os.path.join(ROOT, "forge", "recipes", arg, "recipe.json"))
    for c in candidates:
        if os.path.isfile(c):
            with open(c) as fh:
                return os.path.abspath(c), json.load(fh)
    die(f"no recipe found for {arg!r} (looked in: {', '.join(candidates)})")


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Render each stem of a forge recipe through its own Brahma creature.",
    )
    ap.add_argument("recipe", help="path to recipe.json, a recipe dir, or a recipe name")
    ap.add_argument("--out", required=True, help="output track WAV (e.g. out/heist.wav)")
    ap.add_argument("--dur", type=float, default=None,
                    help="render length in seconds (default: longest stem)")
    ap.add_argument("--map", dest="voice_map", default=None,
                    help="override voices, e.g. drums=ossuary,other=janiform")
    args = ap.parse_args()

    recipe_path, recipe = resolve_recipe(args.recipe)
    recipe_dir = os.path.dirname(recipe_path)
    name = recipe.get("name") or os.path.basename(recipe_dir)
    parts = recipe.get("parts") or {}
    if not parts:
        die(f"recipe {name!r} has no parts")

    voice_map = parse_map(args.voice_map)

    ffmpeg = find_bin("ffmpeg", ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"])
    ffprobe = find_bin("ffprobe", ["/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe"])
    if not ffmpeg or not ffprobe:
        die("ffmpeg + ffprobe are required", 3)
    sclang = find_bin("sclang", SCLANG_CANDIDATES)
    scsynth = find_bin("scsynth", SCSYNTH_CANDIDATES)
    if not sclang or not scsynth:
        die("SuperCollider not found (need sclang + scsynth). Install SuperCollider 3.13+.", 3)
    if not os.path.isfile(RENDERER):
        die(f"renderer missing: {RENDERER}", 3)

    # Assemble the render list in canonical stem order (skip absent stems).
    render_stems = []  # (stem, voice, amp, canonical_wav_path)
    for stem in STEM_ORDER:
        if stem not in parts:
            continue
        wav = os.path.join(recipe_dir, f"{stem}.wav")
        if not os.path.isfile(wav):
            die(f"recipe references {stem} but {wav} is missing (re-run forge.sh)")
        voice = voice_map.get(stem, DEFAULT_MAP.get(stem, "mnemosyne"))
        amp = DEFAULT_AMP.get(stem, DEFAULT_AMP_FALLBACK)
        render_stems.append((stem, voice, amp, wav))
    if not render_stems:
        die(f"recipe {name!r} has no renderable stems ({', '.join(parts)})")

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    work = tempfile.mkdtemp(prefix="stemforge_")
    try:
        # Normalize every stem to stereo 44.1k WAV (the voices expect 2ch).
        norm_paths = []
        max_dur = 0.0
        for stem, _voice, _amp, wav in render_stems:
            npath = os.path.join(work, f"{stem}.wav")
            subprocess.run(
                [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", wav,
                 "-ac", "2", "-ar", "44100", "-c:a", "pcm_s16le", npath],
                check=True,
            )
            norm_paths.append(npath)
            d = probe_duration(ffprobe, npath)
            if d:
                max_dur = max(max_dur, d)

        duration = args.dur if args.dur else (min(max_dur, 600.0) if max_dur else 12.0)
        duration = round(max(duration, 1.0), 3)

        # Build the sclang driver: arrays of paths / voice symbols / amps.
        paths_lit = "[" + ", ".join(sc_str(p) for p in norm_paths) + "]"
        voices_lit = "[" + ", ".join("\\forge_" + rs[1] for rs in render_stems) + "]"
        amps_lit = "[" + ", ".join(f"{rs[2]}" for rs in render_stems) + "]"
        out_abs = os.path.abspath(args.out)

        driver = os.path.join(work, "driver.scd")
        with open(driver, "w") as fh:
            fh.write(
                f'Server.program = {sc_str(scsynth)};\n'
                f'{sc_str(RENDERER)}.load;\n'
                f'~stem_forge.renderRecipe({paths_lit}, {voices_lit}, {amps_lit}, '
                f'{sc_str(out_abs)}, {duration}.asFloat, true);\n'
            )

        print(f"stemforge: recipe '{name}' -> {out_abs}  ({duration}s)", file=sys.stderr)
        for stem, voice, amp, _wav in render_stems:
            print(f"  {stem:7s} -> forge_{voice}  (amp {amp})", file=sys.stderr)

        # Run sclang headless with a wall-clock safety timeout.
        limit = int(duration * 4 + 60)
        try:
            subprocess.run([sclang, driver], timeout=limit)
        except subprocess.TimeoutExpired:
            print("stemforge: sclang timed out (render may be partial)", file=sys.stderr)

        # scsynth leaves a scratch .osc command file next to the output.
        for scratch in (out_abs + ".osc",):
            try:
                os.remove(scratch)
            except OSError:
                pass

        if not (os.path.isfile(out_abs) and os.path.getsize(out_abs) > 0):
            die("render produced no output (see sclang output above)", 1)

        out_dur = probe_duration(ffprobe, out_abs)
        manifest = {
            "name": name,
            "recipe": recipe_path,
            "output": out_abs,
            "duration_s": out_dur,
            "engine": "brahma-nrt/14_stem_voices",
            "render": "per-stem",
            "stems": [
                {
                    "stem": stem,
                    "voice": f"forge_{voice}",
                    "amp": amp,
                    "source": (parts.get(stem) or {}).get("source"),
                    "source_sha256": (parts.get(stem) or {}).get("sha256"),
                    "stem_sha256": sha256(wav),
                }
                for stem, voice, amp, wav in render_stems
            ],
        }
        man_path = out_abs + ".manifest.json"
        with open(man_path, "w") as fh:
            json.dump(manifest, fh, indent=2)
            fh.write("\n")

        print(f"stemforge: OK -> {out_abs}"
              + (f" ({out_dur:.2f}s)" if out_dur else "")
              + f"\nstemforge: manifest -> {man_path}")
        return 0
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
