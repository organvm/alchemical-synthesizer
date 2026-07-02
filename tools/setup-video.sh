#!/usr/bin/env bash
# setup-video.sh — Provision headless video export for the Visual Cortex.
#
# tools/videotrack.sh renders the Etz Chaim cosmos to a matching audio-reactive
# clip. That render runs the real p5 sketch in headless Chrome via Puppeteer.
#
# Puppeteer (and the Chromium it downloads) is a heavy, optional tool, so — like
# demucs's .venv-demucs — it is NOT in brahma/web/package.json. Installing it
# with --no-save keeps it out of the committed manifest (so CI's `npm ci` never
# pulls Chromium) while landing it in brahma/web/node_modules (gitignored), where
# tools/render_video.mjs auto-discovers it.
#
# Also checks for ffmpeg (used to decode audio for analysis and to mux the clip).
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"           # repo root
WEB="$HERE/brahma/web"

echo "setup-video: provisioning headless video export…"

command -v node >/dev/null 2>&1 || { echo "setup-video: node required (brew install node)" >&2; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "setup-video: npm required (comes with node)" >&2; exit 1; }
if ! command -v ffmpeg >/dev/null 2>&1 && [ ! -x /opt/homebrew/bin/ffmpeg ]; then
  echo "setup-video: WARNING — ffmpeg not found; videotrack needs it (brew install ffmpeg)" >&2
fi

echo "  -> installing puppeteer (--no-save) into $WEB/node_modules"
( cd "$WEB" && npm install --no-save --no-audit --no-fund puppeteer )

# Verify Chromium is present; newer puppeteer defers the browser download.
if ( cd "$WEB" && node -e "require.resolve('puppeteer')" ) >/dev/null 2>&1; then
  echo "  -> ensuring a Chromium build is installed"
  ( cd "$WEB" && npx --no-install puppeteer browsers install chrome ) || \
    echo "  (chrome install skipped/failed — puppeteer will fetch on first run)"
  echo "setup-video: DONE. Render:  make videotrack TRACK=out/heist.wav"
else
  echo "setup-video: FAILED — puppeteer did not install" >&2
  exit 1
fi
