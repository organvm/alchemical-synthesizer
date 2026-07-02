# ⚒ Forge — the production pipeline

**Kind:** tool (a repeatable pipeline). **Lane:** `feat(forge):`.
Registered in [`../ORGANS.md`](../ORGANS.md).

The repeatable spine that turns any audio into a shippable track + matching
visual, so a track ships a couple times a week and each one pushes the sampler:

```
ingest ─▶ rip (stems) ─▶ forge (recombine) ─▶ render (NRT through Brahma) ─▶ visual ─▶ package
```

## What it owns

The pipeline tools and its runtime output both live here (`forge/stems/`,
`forge/recipes/` are gitignored output):

| Tool | Stage |
|------|-------|
| `forge/ingest.sh` | any song → scsynth-ready WAV (ffmpeg) |
| `forge/rip.py` | song → stems (demucs → ffmpeg fallback cascade) |
| `forge/forge.sh` · `forge/stemforge.py` | recombine stolen stems into a recipe + provenance |
| `forge/bounce.sh` | headless NRT bounce (`brahma/sc/13_nrt_renderer.scd`) |
| `forge/tune.py` · `forge/validate_audio.py` | tuning + audio validation |
| `forge/analyze_audio.py` · `forge/render_video.mjs` · `forge/videotrack.sh` | audio-reactive visual export (`brahma/web`) |
| `forge/package.sh` | social-ready bundle (video + cover) |
| `forge/setup-demucs.sh` · `forge/setup-video.sh` | one-time provisioning |

Makefile targets: `ingest rip forge render track stemtrack demucs videotrack
video package tune validate`.

## Boundary

- Forge **draws on Brahma** (renders through `brahma/sc/*`, visualizes
  `brahma/web`) and produces artifacts. It does not stream — handing a finished
  track to the radio is Aether's job (`make submit`).
- `tools/build_release.sh` is **not** Forge — it is repo-level release infra
  (CI-coupled). Leave it in `tools/`.

## Consolidation — DONE

All 13 tools moved `tools/ → forge/` via `git mv`; every `tools/X` reference was
repointed in lockstep across the `Makefile`, `ROADMAP.md`, `product/`, the moved
scripts' own sibling calls, and the smoke harness — verified with `make -n` and
`make smoke`. Because each script computes repo-root as *parent of its own dir*
(`dirname(dirname(__file__))` / `$(dirname "$0")/..`), and `tools/` and `forge/`
are both one level under root, the base-path logic needed **zero** changes.

One cross-lane wrinkle, handled: Aether's `broadcast.sh` reuses `forge/tune.py`
(submission capture) and `forge/bounce.sh` (SC-gated NRT tier) at runtime, and
the container's `COPY tools/` was wholesale — so `deploy/aether/Dockerfile` now
also `COPY`s those two into `/app/forge/`. Both calls degrade gracefully if
absent and the 24/7 container is not yet deployed, so no live-radio risk; it just
keeps the eventual gated deploy consistent. This is a legitimate Aether → Forge
dependency (the arrow only forbids Forge → Aether).

No remaining lane-hygiene work. Future Forge features land under `forge/`.
