#!/usr/bin/env bash
# ingest.sh — Assimilate ANY audio file into Brahma-ready WAV(s).
#
# Stage 1 of the forge: "the food." scsynth reads WAV/AIFF (libsndfile), not
# mp3/m4a — so every donor song is first normalized to 44.1 kHz PCM. We emit
# both a stereo and a mono rendering so downstream stages can pick.
#
#   Usage:  tools/ingest.sh <input-audio> [outdir]
#   Emits:  <outdir>/<name>.wav       (stereo, 44.1k, 16-bit)
#           <outdir>/<name>.mono.wav   (mono,   44.1k, 16-bit)
#   Prints: the stereo WAV path on stdout (for pipelines).
set -euo pipefail

IN="${1:?usage: ingest.sh <input-audio> [outdir]}"
OUT="${2:-./forge/ingest}"
SR=44100

command -v ffmpeg >/dev/null 2>&1 || { echo "ingest: ffmpeg is required (brew install ffmpeg)" >&2; exit 2; }
[ -f "$IN" ] || { echo "ingest: no such file: $IN" >&2; exit 2; }

mkdir -p "$OUT"
base="$(basename "${IN%.*}")"
stereo="$OUT/${base}.wav"
mono="$OUT/${base}.mono.wav"

ffmpeg -hide_banner -loglevel error -y -i "$IN" -ac 2 -ar "$SR" -c:a pcm_s16le "$stereo"
ffmpeg -hide_banner -loglevel error -y -i "$IN" -ac 1 -ar "$SR" -c:a pcm_s16le "$mono"

echo "ingest: $IN -> $stereo (+ mono)" >&2
echo "$stereo"
