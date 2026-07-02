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
#
# We also install torchcodec: torchaudio >= 2.9 removed its built-in audio I/O
# backends and routes save/load through TorchCodec (which links the system
# FFmpeg's libav*). Without it demucs separates fine but fails at the save step
# ('ModuleNotFoundError: torchcodec'). Requires a system ffmpeg on PATH.
set -euo pipefail

# What each installer pulls in: demucs (the model) + torchcodec (torchaudio I/O).
DEMUCS_PKGS="demucs torchcodec"

echo "setup-demucs: provisioning true source separation (htdemucs)…"

try_uv() {
  command -v uv >/dev/null 2>&1 || return 1
  echo "  -> uv detected: creating a torch-capable env (.venv-demucs on Python 3.11)"
  uv venv --python 3.11 .venv-demucs
  # torch CPU wheels + demucs + torchcodec (torchaudio I/O backend)
  uv pip install --python .venv-demucs/bin/python $DEMUCS_PKGS
  echo "  installed. rip.py auto-discovers: $(pwd)/.venv-demucs/bin/python"
  return 0
}

try_pipx() {
  command -v pipx >/dev/null 2>&1 || return 1
  echo "  -> pipx detected: installing demucs as an isolated app"
  pipx install demucs
  pipx inject demucs torchcodec   # torchaudio >= 2.9 I/O backend
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
  ./.venv-demucs/bin/python -m pip install $DEMUCS_PKGS
  echo "  installed at $(pwd)/.venv-demucs/bin/python"
  return 0
}

if try_uv || try_pipx || try_venv; then
  echo "setup-demucs: DONE. Verify:  forge/rip.py <song> --engine demucs"
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
