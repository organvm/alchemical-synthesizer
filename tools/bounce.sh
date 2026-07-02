#!/usr/bin/env bash
# bounce.sh — Headless render: a song/stem/premix -> a Brahma-re-expressed WAV.
#
# Drives brahma/sc/13_nrt_renderer.scd through sclang + scsynth -N with NO audio
# device and NO GUI. This is the spine command behind `make render`.
#
#   Usage:  tools/bounce.sh <input.wav|mp3|...> <output.wav> [duration_seconds]
#   e.g.    tools/bounce.sh forge/recipes/heist/premix.wav out/heist.wav 12
#
# Locates SuperCollider whether or not it is on PATH (macOS app bundle included).
set -euo pipefail

IN="${1:?usage: bounce.sh <input> <output.wav> [duration]}"
OUT="${2:?usage: bounce.sh <input> <output.wav> [duration]}"
DUR="${3:-}"

HERE="$(cd "$(dirname "$0")/.." && pwd)"           # repo root
RENDERER="$HERE/brahma/sc/13_nrt_renderer.scd"

command -v ffmpeg  >/dev/null 2>&1 || { echo "bounce: ffmpeg required" >&2; exit 2; }
command -v ffprobe >/dev/null 2>&1 || { echo "bounce: ffprobe required" >&2; exit 2; }
[ -f "$IN" ]       || { echo "bounce: no such input: $IN" >&2; exit 2; }
[ -f "$RENDERER" ] || { echo "bounce: renderer missing: $RENDERER" >&2; exit 2; }

# --- locate SuperCollider (PATH, then common macOS/Linux app-bundle paths) ---
find_bin(){ # $1=name  $2..=candidate absolute paths
  local n="$1"; shift
  if command -v "$n" >/dev/null 2>&1; then command -v "$n"; return 0; fi
  local c; for c in "$@"; do [ -x "$c" ] && { echo "$c"; return 0; }; done
  return 1
}
SCLANG="$(find_bin sclang \
  /Applications/SuperCollider/SuperCollider.app/Contents/MacOS/sclang \
  /Applications/SuperCollider.app/Contents/MacOS/sclang \
  /usr/local/bin/sclang /opt/homebrew/bin/sclang || true)"
SCSYNTH="$(find_bin scsynth \
  /Applications/SuperCollider/SuperCollider.app/Contents/Resources/scsynth \
  /Applications/SuperCollider.app/Contents/Resources/scsynth \
  /usr/local/bin/scsynth /opt/homebrew/bin/scsynth || true)"
if [ -z "$SCLANG" ] || [ -z "$SCSYNTH" ]; then
  echo "bounce: SuperCollider not found (need sclang + scsynth). Install SuperCollider 3.13+." >&2
  exit 3
fi

# --- normalize the food to stereo 44.1k WAV (renderer expects 2ch) ---
mkdir -p "$(dirname "$OUT")"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
food="$work/food.wav"
ffmpeg -hide_banner -loglevel error -y -i "$IN" -ac 2 -ar 44100 -c:a pcm_s16le "$food"

# --- duration: default to the food's own length (capped), unless given ---
if [ -z "$DUR" ]; then
  DUR="$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$food" 2>/dev/null | cut -d. -f1)"
  [ -n "$DUR" ] && [ "$DUR" -gt 0 ] 2>/dev/null || DUR=12
fi

# --- write the sclang driver ---
driver="$work/driver.scd"
cat > "$driver" <<SCD
Server.program = "$SCSYNTH";
"$RENDERER".load;
~nrt_renderer.renderSpecimen("$food", "$OUT", ${DUR}.asFloat, true);
SCD

echo "bounce: sclang=$SCLANG" >&2
echo "bounce: rendering ${DUR}s  $IN -> $OUT" >&2

# --- run sclang headless with a wall-clock safety timeout ---
timeout_bin="$(command -v timeout || command -v gtimeout || true)"
limit=$(( DUR * 4 + 60 ))
if [ -n "$timeout_bin" ]; then
  "$timeout_bin" "$limit" "$SCLANG" "$driver" || true
else
  "$SCLANG" "$driver" &
  pid=$!
  ( sleep "$limit"; kill "$pid" 2>/dev/null || true ) & watcher=$!
  wait "$pid" 2>/dev/null || true
  kill "$watcher" 2>/dev/null || true
fi

rm -f "$OUT.osc" 2>/dev/null || true
if [ -s "$OUT" ]; then
  dur="$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$OUT" 2>/dev/null || echo '?')"
  echo "bounce: OK -> $OUT (${dur}s)"
else
  echo "bounce: FAILED — no output produced (see sclang output above)" >&2
  exit 1
fi
