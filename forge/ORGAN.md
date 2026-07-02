# ⚒ Forge — the production pipeline

**Kind:** tool (a repeatable pipeline). **Lane:** `feat(forge):`.
Registered in [`../ORGANS.md`](../ORGANS.md).

The repeatable spine that turns any audio into a shippable track + matching
visual, so a track ships a couple times a week and each one pushes the sampler:

```
ingest ─▶ rip (stems) ─▶ forge (recombine) ─▶ render (NRT through Brahma) ─▶ visual ─▶ package
```

## What it owns

Runtime output lives here already (`forge/stems/`). The pipeline **tools** still
live in `tools/` (path-coupled — see "Owned remaining work"):

| Tool | Stage |
|------|-------|
| `tools/ingest.sh` | any song → scsynth-ready WAV (ffmpeg) |
| `tools/rip.py` | song → stems (demucs → ffmpeg fallback cascade) |
| `tools/forge.sh` · `tools/stemforge.py` | recombine stolen stems into a recipe + provenance |
| `tools/bounce.sh` | headless NRT bounce (`brahma/sc/13_nrt_renderer.scd`) |
| `tools/tune.py` · `tools/validate_audio.py` | tuning + audio validation |
| `tools/analyze_audio.py` · `tools/render_video.mjs` · `tools/videotrack.sh` | audio-reactive visual export (`brahma/web`) |
| `tools/package.sh` | social-ready bundle (video + cover) |
| `tools/setup-demucs.sh` · `tools/setup-video.sh` | one-time provisioning |

Makefile targets: `ingest rip forge render track stemtrack demucs videotrack
video package tune validate`.

## Boundary

- Forge **draws on Brahma** (renders through `brahma/sc/*`, visualizes
  `brahma/web`) and produces artifacts. It does not stream — handing a finished
  track to the radio is Aether's job (`make submit`).
- `tools/build_release.sh` is **not** Forge — it is repo-level release infra
  (CI-coupled). Leave it in `tools/`.

## Owned remaining work — consolidate `tools/` → `forge/` (deploy-safe)

The Forge tools are safe to relocate (no live-container coupling), verifiable
offline with `make -n`. Staged untangle (per `../ORGANS.md`):

1. **Decouple** — each script resolves siblings via a lane-relative base rather
   than a hardcoded `tools/X`.
2. **`git mv`** the tools above into `forge/`, updating the `Makefile`,
   `ROADMAP.md`, `product/bin/smoke.js`, and `product/src/api/mcp.js` in lockstep.
3. **Verify** — `make -n rip forge render track stemtrack video package` resolves
   to the new paths; `make smoke` green.

Until then the tools stay in `tools/` and this manifest is their notice of
ownership.
