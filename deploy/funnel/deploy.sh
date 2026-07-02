#!/usr/bin/env bash
# ============================================================================
#  deploy.sh — build + deploy the AETHER free funnel to Cloudflare Pages.
# ----------------------------------------------------------------------------
#  Repeatable, idempotent. Assembles the static funnel from product/public/home
#  into ./public (the pages_build_output_dir), then `wrangler pages deploy`.
#  The waitlist Function (functions/) is compiled + shipped automatically and
#  bound to the AETHER_WAITLIST KV namespace via wrangler.toml.
#
#  Auth: CLOUDFLARE_API_TOKEN from ~/.limen.env (organ-hydrated). This script
#  sources it if present; the value is never printed. No `wrangler login`.
#
#    deploy/funnel/deploy.sh              # build + deploy to production
#    deploy/funnel/deploy.sh --dry-run    # assemble ./public only, no deploy
#
#  Exit: 0 ok · 2 usage · 3 missing source
# ============================================================================
set -euo pipefail

DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1
[ -n "${1:-}" ] && [ "$DRY" -eq 0 ] && { echo "usage: deploy.sh [--dry-run]" >&2; exit 2; }

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SRC="$ROOT/product/public/home"
OUT="$HERE/public"

[ -d "$SRC" ] || { echo "missing funnel source: $SRC" >&2; exit 3; }

# 1. Assemble static assets (a copy of source; ./public is gitignored).
rm -rf "$OUT"; mkdir -p "$OUT"
cp "$SRC"/*.html "$SRC"/*.js "$SRC"/*.css "$SRC"/*.json "$OUT"/ 2>/dev/null || true
n=$(find "$OUT" -type f | wc -l | tr -d ' ')
[ "$n" -ge 1 ] || { echo "assembled 0 files from $SRC" >&2; exit 3; }
echo "assembled $n asset(s) -> $OUT"
echo "functions -> $(find "$HERE/functions" -type f | wc -l | tr -d ' ') route handler(s)"

if [ "$DRY" -eq 1 ]; then
  echo "dry-run: skipping deploy"
  exit 0
fi

# 2. Load org-hydrated CF token (value never printed) and deploy.
# shellcheck disable=SC1090
[ -f "$HOME/.limen.env" ] && { set -a; . "$HOME/.limen.env" 2>/dev/null || true; set +a; }
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN not set (organ-hydrated via creds-hydrate)}"

cd "$HERE"
# Always the live/production funnel. --branch main forces the production
# deployment regardless of the git branch this runs from (e.g. a worktree
# feature branch) — otherwise wrangler infers "preview" and aether-0as.pages.dev
# is left stale.
wrangler pages deploy --branch main --commit-dirty=true
