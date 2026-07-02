#!/usr/bin/env bash
# package.sh — a rendered track -> a social-ready package (post from one folder).
#
# The last joint of the Forge before a track leaves the workshop. Takes a track
# WAV and produces, in one folder you can drag straight into a post:
#   <base>.mp4          the audio-reactive clip, "made with Brahma" mark burned in
#   <base>.cover.png    a cover still (the track's most energetic frame)
#   <base>.caption.txt  a paste-ready caption (title + attribution + link + tags)
#
#   Usage:  tools/package.sh --track out/heist.wav
#              [--title "Heist"] [--link https://...] [--out-dir out/pkg/heist]
#              [--fps 30] [--substrate sound|idea|product|cosmos] [--width N] [--height N]
#
# Set BRAHMA_LINK in the environment to bake your funnel URL into every caption
# (until the funnel exists the caption carries an honest placeholder reminder).
# Composes with `make track` / `make stemtrack`. Needs `make video` first.
#
# Exit: 0 ok · 2 usage · (videotrack's 1/3 on tool or render failure)
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"           # repo root
cd "$HERE"

TRACK=""; TITLE=""; LINK="${BRAHMA_LINK:-}"; OUTDIR=""
FPS=""; SUBSTRATE=""; WIDTH=""; HEIGHT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --track)     TRACK="$2"; shift 2;;
    --title)     TITLE="$2"; shift 2;;
    --link)      LINK="$2"; shift 2;;
    --out-dir)   OUTDIR="$2"; shift 2;;
    --fps)       FPS="$2"; shift 2;;
    --substrate) SUBSTRATE="$2"; shift 2;;
    --width)     WIDTH="$2"; shift 2;;
    --height)    HEIGHT="$2"; shift 2;;
    *) echo "package: unknown arg $1" >&2; exit 2;;
  esac
done

[ -n "$TRACK" ] || { echo "usage: package.sh --track <audio> [--title T] [--link URL] [--out-dir DIR]" >&2; exit 2; }
[ -f "$TRACK" ] || { echo "package: no such track: $TRACK" >&2; exit 2; }

base="$(basename "$TRACK")"; base="${base%.*}"
[ -n "$OUTDIR" ] || OUTDIR="out/pkg/$base"
# default title: the filename with separators as spaces (pass --title for casing)
if [ -z "$TITLE" ]; then TITLE="${base//-/ }"; TITLE="${TITLE//_/ }"; fi

mkdir -p "$OUTDIR"
MP4="$OUTDIR/$base.mp4"
COVER="$OUTDIR/$base.cover.png"
CAPTION="$OUTDIR/$base.caption.txt"

echo "package: building social bundle for '$TITLE' -> $OUTDIR" >&2
bash tools/videotrack.sh --track "$TRACK" --out "$MP4" --cover "$COVER" \
  --attribution --title "$TITLE" \
  ${FPS:+--fps "$FPS"} ${SUBSTRATE:+--substrate "$SUBSTRATE"} \
  ${WIDTH:+--width "$WIDTH"} ${HEIGHT:+--height "$HEIGHT"}

# --- paste-ready caption -----------------------------------------------------
if [ -n "$LINK" ]; then
  link_line="$LINK"
else
  link_line="▸ link: set \$BRAHMA_LINK once the funnel is live"
fi
cat > "$CAPTION" <<EOF
$TITLE

Made with Brahma — the alchemical synthesizer.
Ripped apart and re-expressed; the visuals are the same audio, seen.

$link_line

#Brahma #AlchemicalSynthesizer #ModularSynth #GenerativeArt #SuperCollider #ExperimentalMusic #SoundDesign
EOF

echo "package: OK -> $OUTDIR"
echo "  video   : $MP4"
echo "  cover   : $COVER"
echo "  caption : $CAPTION"
