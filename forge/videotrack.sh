#!/usr/bin/env bash
# videotrack.sh — a rendered track -> a matching audio-reactive video (mp4).
#
# The visual half of the Forge pipeline: analyze a track's audio into a per-frame
# envelope, drive the Visual Cortex (Etz Chaim Tree of Life) headlessly frame by
# frame, then mux the frames with the original audio into a post-ready clip.
#
#   Usage:  forge/videotrack.sh --track out/heist.wav [--out out/heist.mp4]
#                [--fps 30] [--width 1080] [--height 1080]
#                [--substrate sound|idea|product|cosmos] [--bands 12]
#                [--hud] [--keep-frames]
#                [--attribution] [--title "Heist"] [--cover out/heist.cover.png]
#
# --attribution/--title burn a "made with Brahma" mark (+ title) into the clip;
# --cover writes the track's most energetic frame out as a still. (forge/package.sh
# wires these into a post-ready bundle.)
#
# Pipeline:  analyze_audio.py  ->  render_video.mjs (puppeteer)  ->  ffmpeg mux
# Exit: 0 ok · 2 usage · 3 missing tool (ffmpeg/node/puppeteer) · 1 render/mux fail
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"           # repo root
cd "$HERE"

TRACK=""; OUT=""; FPS=30; WIDTH=1080; HEIGHT=1080
SUBSTRATE="sound"; BANDS=12; HUD=0; KEEP=0
COVER=""; TITLE=""; ATTR=0
while [ $# -gt 0 ]; do
  case "$1" in
    --track)     TRACK="$2"; shift 2;;
    --out)       OUT="$2"; shift 2;;
    --fps)       FPS="$2"; shift 2;;
    --width)     WIDTH="$2"; shift 2;;
    --height)    HEIGHT="$2"; shift 2;;
    --substrate) SUBSTRATE="$2"; shift 2;;
    --bands)     BANDS="$2"; shift 2;;
    --hud)       HUD=1; shift;;
    --keep-frames) KEEP=1; shift;;
    --cover)     COVER="$2"; shift 2;;
    --title)     TITLE="$2"; shift 2;;
    --attribution) ATTR=1; shift;;
    *) echo "videotrack: unknown arg $1" >&2; exit 2;;
  esac
done

[ -n "$TRACK" ] || { echo "usage: videotrack.sh --track <audio> [--out out.mp4] [opts]" >&2; exit 2; }
[ -f "$TRACK" ] || { echo "videotrack: no such track: $TRACK" >&2; exit 2; }

# default output: out/<trackbase>.mp4
if [ -z "$OUT" ]; then
  base="$(basename "$TRACK")"; OUT="out/${base%.*}.mp4"
fi

# --- locate tools (PATH, then common macOS/Linux prefixes) ---
find_bin(){ local n="$1"; shift; if command -v "$n" >/dev/null 2>&1; then command -v "$n"; return 0; fi
  local c; for c in "$@"; do [ -x "$c" ] && { echo "$c"; return 0; }; done; return 1; }
FFMPEG="$(find_bin ffmpeg /opt/homebrew/bin/ffmpeg /usr/local/bin/ffmpeg /usr/bin/ffmpeg || true)"
FFPROBE="$(find_bin ffprobe /opt/homebrew/bin/ffprobe /usr/local/bin/ffprobe /usr/bin/ffprobe || true)"
NODE="$(find_bin node /opt/homebrew/bin/node /usr/local/bin/node || true)"
PYTHON="$(find_bin python3 /opt/homebrew/bin/python3 /usr/local/bin/python3 || true)"
[ -n "$FFMPEG" ]  || { echo "videotrack: ffmpeg required (brew install ffmpeg)" >&2; exit 3; }
[ -n "$FFPROBE" ] || { echo "videotrack: ffprobe required (brew install ffmpeg)" >&2; exit 3; }
[ -n "$NODE" ]    || { echo "videotrack: node required" >&2; exit 3; }
[ -n "$PYTHON" ]  || { echo "videotrack: python3 required" >&2; exit 3; }

# puppeteer is provisioned on demand (make video); resolve it from brahma/web
if ! ( cd "$HERE/brahma/web" && "$NODE" -e "require.resolve('puppeteer')" ) >/dev/null 2>&1; then
  echo "videotrack: puppeteer not installed — run 'make video' (forge/setup-video.sh)" >&2
  exit 3
fi

# libx264 + yuv420p need even dimensions
WIDTH=$(( WIDTH - WIDTH % 2 )); HEIGHT=$(( HEIGHT - HEIGHT % 2 ))

mkdir -p "$(dirname "$OUT")"
work="$(mktemp -d)"; [ "$KEEP" = "1" ] || trap 'rm -rf "$work"' EXIT
frames="$work/frames"; env="$work/env.json"

echo "videotrack: analyzing $TRACK (${FPS}fps, ${BANDS} bands)" >&2
"$PYTHON" forge/analyze_audio.py "$TRACK" --out "$env" --fps "$FPS" --bands "$BANDS"

echo "videotrack: rendering cosmos ${WIDTH}x${HEIGHT} (substrate=$SUBSTRATE)" >&2
# Build render flags as an array. Guard the expansion — on macOS bash 3.2,
# "${arr[@]}" over an empty array trips `set -u` ("unbound variable").
render_flags=()
[ "$HUD" = "1" ]  && render_flags+=(--hud)
[ "$ATTR" = "1" ] && render_flags+=(--attribution)
[ -n "$TITLE" ]   && render_flags+=(--title "$TITLE")
"$NODE" forge/render_video.mjs --env "$env" --frames "$frames" \
  --width "$WIDTH" --height "$HEIGHT" --fps "$FPS" --substrate "$SUBSTRATE" \
  ${render_flags[@]+"${render_flags[@]}"}

echo "videotrack: muxing frames + audio -> $OUT" >&2
"$FFMPEG" -hide_banner -loglevel error -y \
  -framerate "$FPS" -i "$frames/frame_%06d.png" \
  -i "$TRACK" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium \
  -c:a aac -b:a 192k -shortest "$OUT"

# --- verify the clip carries both a video and an audio stream ---
if [ ! -s "$OUT" ]; then echo "videotrack: FAILED — no output produced" >&2; exit 1; fi
vstreams="$("$FFPROBE" -v error -select_streams v -show_entries stream=codec_type -of csv=p=0 "$OUT" | wc -l | tr -d ' ')"
astreams="$("$FFPROBE" -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$OUT" | wc -l | tr -d ' ')"
dur="$("$FFPROBE" -v error -show_entries format=duration -of default=nk=1:nw=1 "$OUT" 2>/dev/null || echo '?')"
if [ "$vstreams" -lt 1 ] || [ "$astreams" -lt 1 ]; then
  echo "videotrack: FAILED — output missing video ($vstreams) or audio ($astreams) stream" >&2; exit 1
fi
echo "videotrack: OK -> $OUT (${dur}s, ${WIDTH}x${HEIGHT}@${FPS}, video+audio)"

# --- optional cover still: the track's most energetic frame -------------------
# Chosen by peak RMS from the same envelope that drove the render, so the cover
# is literally the video's loudest moment (attribution mark already on it). Must
# run before the EXIT trap reaps $work.
if [ -n "$COVER" ]; then
  peak="$("$PYTHON" -c 'import json,sys; e=json.load(open(sys.argv[1])).get("env",[]); print(max(range(len(e)), key=lambda i: e[i].get("rms",0)) if e else 0)' "$env")"
  src="$frames/frame_$(printf '%06d' "$peak").png"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$COVER")"; cp "$src" "$COVER"
    echo "videotrack: cover -> $COVER (peak-energy frame $peak)"
  else
    echo "videotrack: WARN cover frame missing ($src)" >&2
  fi
fi

[ "$KEEP" = "1" ] && echo "videotrack: frames kept in $frames" >&2 || true
