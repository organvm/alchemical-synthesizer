#!/usr/bin/env bash
# forge.sh — Recombine stolen stems into a new recipe ("drums from A, melody from B").
#
# This is the modular composer at the file level: point each part at a stem from
# ANY rip (see tools/rip.py). The forge assembles them into a recipe directory,
# records provenance in recipe.json, and (with --mix) bounces a rough premix WAV
# you can immediately feed to the Brahma NRT renderer (tools/bounce.sh) for
# re-expression.
#
#   Usage:
#     tools/forge.sh --name NAME [--out DIR] \
#         --drums  forge/stems/songA/drums.wav \
#         --melody forge/stems/songB/other.wav \
#         [--bass path] [--vocals path] [--other path] [--mix]
#
#   --melody is an alias for --other (the melodic/harmonic stem).
#   --mix    also renders <NAME>/premix.wav = all chosen stems summed & normalized.
#
#   Emits:  <out>/<NAME>/{drums,bass,vocals,other}.wav (only those provided)
#           <out>/<NAME>/recipe.json  (provenance: which song each part came from)
#           <out>/<NAME>/premix.wav   (if --mix)
set -euo pipefail

OUT="./forge/recipes"; NAME=""; MIX=0
declare -A PART   # canonical stem name -> source path
order=(drums bass vocals other)

die(){ echo "forge: $*" >&2; exit 2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --name)   NAME="$2"; shift 2;;
    --out)    OUT="$2"; shift 2;;
    --drums)  PART[drums]="$2"; shift 2;;
    --bass)   PART[bass]="$2"; shift 2;;
    --vocals) PART[vocals]="$2"; shift 2;;
    --other|--melody) PART[other]="$2"; shift 2;;
    --mix)    MIX=1; shift;;
    -h|--help) grep -E '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) die "unknown arg: $1";;
  esac
done

[ -n "$NAME" ] || die "missing --name"
[ "${#PART[@]}" -gt 0 ] || die "no stems given (need at least one of --drums/--bass/--vocals/--melody)"
command -v ffmpeg >/dev/null 2>&1 || die "ffmpeg is required"

dest="$OUT/$NAME"
mkdir -p "$dest"

# Copy each chosen stem in under its canonical name; build recipe.json parts.
parts_json=""
inputs=()
for name in "${order[@]}"; do
  src="${PART[$name]:-}"
  [ -n "$src" ] || continue
  [ -f "$src" ] || die "no such stem: $src"
  cp "$src" "$dest/$name.wav"
  inputs+=("$dest/$name.wav")
  sha="$(shasum -a 256 "$src" | awk '{print $1}')"
  parts_json="${parts_json}    \"$name\": { \"source\": \"$(cd "$(dirname "$src")" && pwd)/$(basename "$src")\", \"sha256\": \"$sha\" },
"
done

# Optional rough premix (equal-power-ish sum, loudness-normalized) — a single WAV
# the existing single-input renderer can consume immediately.
premix_json="null"
if [ "$MIX" -eq 1 ]; then
  premix="$dest/premix.wav"
  args=(); for f in "${inputs[@]}"; do args+=(-i "$f"); done
  n="${#inputs[@]}"
  ffmpeg -hide_banner -loglevel error -y "${args[@]}" \
    -filter_complex "amix=inputs=${n}:duration=longest:normalize=1,loudnorm=I=-16:TP=-1.5:LRA=11" \
    -ac 2 -ar 44100 -c:a pcm_s16le "$premix"
  premix_json="\"$(basename "$premix")\""
  echo "forge: premix -> $premix" >&2
fi

cat > "$dest/recipe.json" <<JSON
{
  "name": "$NAME",
  "parts": {
${parts_json%,
}
  },
  "premix": $premix_json
}
JSON

echo "forge: recipe '$NAME' -> $dest"
echo "  parts: ${!PART[*]}"
[ "$MIX" -eq 1 ] && echo "  premix: $dest/premix.wav (feed to tools/bounce.sh)"
echo "  recipe: $dest/recipe.json"
