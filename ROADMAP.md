# 🗺️ Alchemical Roadmap

This roadmap is a living system. It bridges the gap between the **Brahma Strategy** and daily execution.

## 🚀 Strategic Themes

- **[T] Tech Maturity**: Stability, NRT Rendering, and DSP Optimization.
- **[O] Ontological Growth**: Expanding Adam Kadmon's schema.
- **[E] Ecological Diversity**: Creating new anthropomorphized organisms.

---

## 📅 Milestones

### Phase 1: Stability (Active)
- [x] Server-side 1kHz Bus Tick
- [x] Basic Sampler Creatures
- [ ] Multi-channel specimen recording

### The Forge — sample → track → visual → post/sell pipeline
> The repeatable spine so a track ships a couple times a week and each one pushes
> the sampler. Stage the joints; ship the smallest reversible piece first.

- [x] **Ingest** — any song → scsynth-ready WAV (`tools/ingest.sh`, ffmpeg). *Verified.*
- [x] **Rip apart** — song → stems (drums/bass/vocals/other) via a tiered cascade
      (`tools/rip.py`): Tier-1 **demucs** (true separation) → Tier-3 **ffmpeg**
      fallback (approximate, dependency-free, runs today). *Verified (ffmpeg tier).*
- [x] **Forge** — recombine stolen stems ("drums from A, melody from B") into a
      recipe + provenance (`tools/forge.sh`), with `--mix` premix. *Verified.*
- [x] **Render** — headless NRT bounce, a WAV → Brahma-re-expressed WAV, no GUI /
      no audio device (`brahma/sc/13_nrt_renderer.scd` + `tools/bounce.sh`).
      *Verified on SuperCollider 3.14.1.*
- [x] **Cadence** — one command from two stems to a track: `make track`. *Verified.*
- [ ] **Tier-1 separation live** — provision demucs (`tools/setup-demucs.sh`) so
      rips are true drum/melody theft, not band-splits. *(blocked: torch has no
      wheel for this box's Python 3.14 → install on 3.11 via uv/venv.)*
- [x] **Per-stem render** — feed each stem to a distinct creature (drums→Ossuary,
      bass→Mnemosyne, vocals→Chrysalid, melody→Prima) via a multi-buffer Score
      that sums the voices under a master limiter, instead of a single premix
      (`tools/stemforge.py` + `brahma/sc/14_stem_voices.scd`; `make stemtrack`,
      per-stem `--map`). *The "supremely powerful modular" render. Verified on-machine.*
- [ ] **Matching visual** — audio-reactive video export from the Etz Chaim Visual
      Cortex (`brahma/web`): MediaRecorder capture driven by the render's OSC trace,
      then ffmpeg-mux to the track. (`tools/package.sh`)
- [ ] **Package** — one social-ready asset per track: mux audio+video, cover PNG,
      "made with Brahma" attribution + short link.
- [ ] **Funnel** — serve real audio at `/api/v1/specimens/:id/audio`, a track
      landing page with the existing waitlist capture, deploy the static surface
      (capture demand first; no payment rail until a real buyer exists).

**Human-gated decision atoms** (do not silently decide):
- **Rights posture** — commercially sampling copyrighted songs. Safe default in the
  tooling: pipeline runs on *any* input, but anything **published/sold** uses
  rights-cleared source (your own / CC0 / licensed) or unrecognizably transformed
  material; recognizable-song rips stay private R&D until cleared.
- **Social surface** — which handle/platform hosts the tracks (the studio face is
  text/voice-branded; Brahma music likely needs its own identity).

### Phase 2: Propagation
- [ ] Distributed OSC backplane
- [ ] VCV Rack integration layer
- [ ] Expanded Trait Mapping (FluidBuf integration)

---

## 🛠️ Field Taxonomy

We categorize items in our GitHub Project using these fields:
- **Status**: Triage → Backlog → Design → In Progress → Validation → Done
- **Strategic Theme**: [T], [O], [E]
- **Confidence**: High / Med / Low
- **Target Ritual**: The designated time for completion.

---

*“If it is not on the Roadmap, it does not exist.”*
