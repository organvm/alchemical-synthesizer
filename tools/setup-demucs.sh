#!/usr/bin/env bash
# setup-demucs.sh — Provision TRUE source separation (Meta's Demucs) for rip.py.
#
# rip.py runs a dependency-free ffmpeg fallback out of the box (approximate
# stems). This installs the real thing — htdemucs, which cleanly separates
# drums / bass / vocals / other — so "steal the drums from A, the melody from B"
# becomes true separation, not a band-split.
#
# Demucs needs PyTorch, which may have NO wheel for a bleeding-edge Python (this
# machine is on 3.14). So we prefer an isolated env on a torch-supported Python
# (3.10-3.12), trying the best available tool first (cascade):
#   1. uv       — fastest, manages the Python version itself
#   2. pipx     — isolated app install
#   3. python3.12 / python3.11 / python3.10 venv
#
# After install, rip.py auto-detects demucs and switches to Tier 1 with no flags.
set -euo pipefail

echo "setup-demucs: provisioning true source separation (htdemucs)…"

try_uv() {
  command -v uv >/dev/null 2>&1 || return 1
  echo "  -> uv detected: creating a torch-capable env (.venv-demucs on Python 3.11)"
  uv venv --python 3.11 .venv-demucs
  # torch CPU wheels + demucs
  uv pip install --python .venv-demucs/bin/python demucs
  echo "  installed. rip.py will find: $(pwd)/.venv-demucs/bin/python"
  echo "  (add it to rip.py's CANDIDATE_PYTHONS or symlink onto PATH if not auto-found)"
  return 0
}

try_pipx() {
  command -v pipx >/dev/null 2>&1 || return 1
  echo "  -> pipx detected: installing demucs as an isolated app"
  pipx install demucs
  return 0
}

try_venv() {
  local py=""
  for cand in python3.12 python3.11 python3.10; do
    command -v "$cand" >/dev/null 2>&1 && { py="$cand"; break; }
  done
  [ -n "$py" ] || return 1
  echo "  -> $py detected: creating .venv-demucs"
  "$py" -m venv .venv-demucs
  ./.venv-demucs/bin/python -m pip install --upgrade pip
  ./.venv-demucs/bin/python -m pip install demucs
  echo "  installed at $(pwd)/.venv-demucs/bin/python"
  return 0
}

if try_uv || try_pipx || try_venv; then
  echo "setup-demucs: DONE. Verify:  tools/rip.py <song> --engine demucs"
else
  cat >&2 <<'EOF'
setup-demucs: no compatible installer found.
  This machine's default Python is too new for PyTorch wheels.
  Install ONE of these, then re-run:
    - uv     :  curl -LsSf https://astral.sh/uv/install.sh | sh
    - pipx   :  brew install pipx
    - Python :  brew install python@3.11
  Meanwhile, rip.py's ffmpeg fallback keeps working (approximate stems).
EOF
  exit 1
fi
