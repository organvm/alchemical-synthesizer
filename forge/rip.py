#!/usr/bin/env python3
"""rip.py — Rip a song apart into stems (the "steal the drums, take the melody" organ).

This is Brahma's source-separation front end. It splits a song into its
constituent parts so you can steal the drums from one track and the melody from
another, then feed each stem to a different sampler creature.

It runs a TIERED CASCADE (best available engine wins; it always produces
something):

  Tier 1  demucs   — Meta's htdemucs model. TRUE separation into
                     drums / bass / vocals / other. Requires a torch-capable
                     Python (see forge/setup-demucs.sh). This is the real thing.
  Tier 3  ffmpeg   — dependency-free fallback that runs TODAY. A karaoke
                     center-channel split (instrumental vs. lead) plus
                     frequency-band stems. Approximate, not true separation —
                     labelled `quality: approx` in the manifest — but enough to
                     prototype the pipeline and swap up to demucs with no rewrite.

  Usage:
    forge/rip.py <song> [--out DIR] [--name NAME] [--engine auto|demucs|ffmpeg]
    forge/rip.py songA.mp3 --name songA
    forge/rip.py songB.wav --engine ffmpeg

  Output:
    <out>/<name>/drums.wav bass.wav vocals.wav other.wav  (+ instrumental.wav on ffmpeg tier)
    <out>/<name>/manifest.json   — source, engine, tier, quality, per-stem sha256

The manifest is the contract the forge (forge/forge.sh) and the SC renderer read.
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
from datetime import datetime, timezone

SR = 44100
CANONICAL = ["drums", "bass", "vocals", "other"]

# The isolated interpreter forge/setup-demucs.sh provisions (repo-local, since
# the machine default Python may be too new for a torch wheel). Discovered
# relative to this file so a `make rip` from anywhere finds it.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_VENV_DEMUCS = os.path.join(_REPO_ROOT, ".venv-demucs", "bin", "python")


def _candidate_pythons() -> list[str]:
    """Interpreters to probe for demucs, best/most-specific first.

    Order matters: an explicit override wins, then the repo-local venv that
    setup-demucs.sh creates, then anything on PATH. Without the venv entry a
    successful `setup-demucs.sh` would still leave rip.py on the ffmpeg tier.
    """
    cands = []
    override = os.environ.get("BRAHMA_DEMUCS_PYTHON")
    if override:
        cands.append(override)
    cands.append(_VENV_DEMUCS)
    cands += [sys.executable, "python3.12", "python3.11", "python3.10", "python3"]
    return cands


CANDIDATE_PYTHONS = _candidate_pythons()


def run(cmd, **kw):
    """Run a command; on failure, surface the child's stderr before raising.

    capture_output hides a subprocess's own error message inside the exception,
    which turns a clear 'ModuleNotFoundError: torchcodec' into an opaque
    'returned non-zero exit status 1'. Echo it so failures are diagnosable.
    """
    try:
        return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)
    except subprocess.CalledProcessError as e:
        if e.stderr:
            sys.stderr.write(e.stderr)
        raise


def have(tool: str) -> bool:
    return shutil.which(tool) is not None


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def normalize(inp: str, tmp: str) -> str:
    """Any audio -> 44.1k stereo 16-bit WAV (scsynth-readable)."""
    out = os.path.join(tmp, "_normalized.wav")
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", inp,
         "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", out])
    return out


# ---------------------------------------------------------------- demucs (Tier 1)
def find_demucs_python() -> str | None:
    """Return the first interpreter that can `import demucs`, or None."""
    seen = set()
    for py in CANDIDATE_PYTHONS:
        exe = shutil.which(py) or (py if os.path.isabs(py) and os.path.exists(py) else None)
        if not exe or exe in seen:
            continue
        seen.add(exe)
        try:
            subprocess.run([exe, "-c", "import demucs"], check=True,
                           capture_output=True, text=True)
            return exe
        except Exception:
            continue
    return None


def rip_demucs(py: str, song: str, dest: str, model: str = "htdemucs") -> dict:
    with tempfile.TemporaryDirectory() as td:
        run([py, "-m", "demucs", "-n", model, "--out", td, song])
        # demucs writes <td>/<model>/<trackname>/{drums,bass,vocals,other}.wav
        root = os.path.join(td, model)
        track_dirs = [os.path.join(root, d) for d in os.listdir(root)
                      if os.path.isdir(os.path.join(root, d))]
        src = track_dirs[0]
        stems = {}
        for name in CANONICAL:
            s = os.path.join(src, f"{name}.wav")
            if os.path.exists(s):
                d = os.path.join(dest, f"{name}.wav")
                shutil.move(s, d)
                stems[name] = {"file": os.path.basename(d), "sha256": sha256(d),
                               "quality": "true", "method": f"demucs/{model}"}
    return {"engine": "demucs", "tier": 1, "model": model, "quality": "true", "stems": stems}


# --------------------------------------------------------------- ffmpeg (Tier 3)
def _ff(af: str, src: str, dst: str):
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src,
         "-af", af, "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", dst])


def rip_ffmpeg(wav: str, dest: str) -> dict:
    """Dependency-free approximate split.

    - instrumental: L-R center cancellation (removes centered vocals) — karaoke.
    - vocals:       center extraction (what the cancellation removes), band-limited.
    - bass:         low band (< 150 Hz).
    - drums:        mid transient band (150-2000 Hz) of the instrumental — approx.
    - other:        high band (> 300 Hz) of the instrumental — the melodic residue.
    """
    stems = {}
    plan = {
        "instrumental": ("pan=stereo|c0=c0-c1|c1=c1-c0", "L-R center cancel (karaoke)"),
        "vocals": ("pan=mono|c0=0.5*c0+0.5*c1,highpass=f=180,lowpass=f=6000", "center extract, band-limited"),
        "bass": ("lowpass=f=150", "low band < 150 Hz"),
        "drums": ("pan=stereo|c0=c0-c1|c1=c1-c0,bandpass=f=900:width_type=h:w=1700", "mid transient band of instrumental"),
        "other": ("pan=stereo|c0=c0-c1|c1=c1-c0,highpass=f=300", "high band of instrumental (melody/harmony)"),
    }
    for name, (af, note) in plan.items():
        dst = os.path.join(dest, f"{name}.wav")
        _ff(af, wav, dst)
        stems[name] = {"file": os.path.basename(dst), "sha256": sha256(dst),
                       "quality": "approx", "method": f"ffmpeg:{note}"}
    return {"engine": "ffmpeg-fallback", "tier": 3, "model": None,
            "quality": "approx", "stems": stems}


# ------------------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser(description="Rip a song into stems (drums/bass/vocals/other).")
    ap.add_argument("song", help="input audio (mp3/wav/m4a/flac/...)")
    ap.add_argument("--out", default="./forge/stems", help="output root dir")
    ap.add_argument("--name", default=None, help="subdir name (default: input basename)")
    ap.add_argument("--engine", choices=["auto", "demucs", "ffmpeg"], default="auto")
    ap.add_argument("--model", default="htdemucs", help="demucs model name")
    args = ap.parse_args()

    if not have("ffmpeg"):
        print("rip: ffmpeg is required (brew install ffmpeg)", file=sys.stderr)
        return 2
    if not os.path.isfile(args.song):
        print(f"rip: no such file: {args.song}", file=sys.stderr)
        return 2

    name = args.name or os.path.splitext(os.path.basename(args.song))[0]
    dest = os.path.join(args.out, name)
    os.makedirs(dest, exist_ok=True)

    # choose engine
    demucs_py = None
    if args.engine in ("auto", "demucs"):
        demucs_py = find_demucs_python()
        if args.engine == "demucs" and not demucs_py:
            print("rip: --engine demucs requested but demucs is not importable in any "
                  "candidate Python. Run forge/setup-demucs.sh, or use --engine ffmpeg.",
                  file=sys.stderr)
            return 3

    with tempfile.TemporaryDirectory() as tmp:
        if demucs_py:
            print(f"rip: engine=demucs ({demucs_py}) model={args.model} — true separation", file=sys.stderr)
            result = rip_demucs(demucs_py, args.song, dest, args.model)
        else:
            print("rip: engine=ffmpeg fallback — APPROXIMATE stems (install demucs for true "
                  "drum/melody theft: forge/setup-demucs.sh)", file=sys.stderr)
            wav = normalize(args.song, tmp)
            result = rip_ffmpeg(wav, dest)

    manifest = {
        "source": os.path.abspath(args.song),
        "source_sha256": sha256(args.song),
        "name": name,
        "created": datetime.now(timezone.utc).isoformat(),
        "sample_rate": SR,
        **result,
    }
    mpath = os.path.join(dest, "manifest.json")
    with open(mpath, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"rip: {len(result['stems'])} stems -> {dest}  [tier {result['tier']} / {result['quality']}]")
    for n, s in result["stems"].items():
        print(f"  {n:12s} {s['file']:18s} {s['method']}")
    print(f"  manifest     {os.path.relpath(mpath)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
