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
- [x] **Tier-1 separation live** — demucs (htdemucs) provisioned on Python 3.11
      via `tools/setup-demucs.sh` (uv → `.venv-demucs`, incl. `torchcodec` for the
      torchaudio ≥2.9 I/O backend); `rip.py` auto-discovers the venv (repo-local
      or `$BRAHMA_DEMUCS_PYTHON`) and switches to true drum/melody theft with no
      flags. *Verified on-machine: a tonal input routed to `other` @ −13.5 dB,
      drums/bass/vocals @ ≤ −71 dB — true source split, not a band-split.*
- [x] **Per-stem render** — feed each stem to a distinct creature (drums→Ossuary,
      bass→Mnemosyne, vocals→Chrysalid, melody→Prima) via a multi-buffer Score
      that sums the voices under a master limiter, instead of a single premix
      (`tools/stemforge.py` + `brahma/sc/14_stem_voices.scd`; `make stemtrack`,
      per-stem `--map`). *The "supremely powerful modular" render. Verified on-machine.*
- [x] **Matching visual** — audio-reactive video export from the Etz Chaim Visual
      Cortex (`brahma/web`). A track's audio is analyzed into a per-frame envelope
      (`tools/analyze_audio.py`: RMS + log-spaced spectral bands + flatness + onsets,
      stdlib + ffmpeg), which drives the real p5 sketch headlessly frame-by-frame
      (`tools/render_video.mjs` via puppeteer; `tree/video.js` maps bands→vessels
      bass-to-crown, loudness→gain, flatness→entropy, onsets→Lightning Flash, with a
      deterministic frame-clock override of `millis()`), then ffmpeg muxes frames +
      audio into a post-ready mp4. `make videotrack TRACK=out/x.wav` (setup once via
      `make video`). *Composes with `make track`/`make stemtrack`.*
- [x] **Package** — one command turns a track into a social-ready bundle in
      `out/pkg/<base>/`: the audio-reactive `.mp4` with a "made with Brahma" mark
      (+ track title) drawn *in p5* so it's deterministic (no ffmpeg font burn),
      a `.cover.png` (the track's peak-energy frame, so the still can't drift from
      the clip), and a paste-ready `.caption.txt` (title + attribution + link +
      tags; set `$BRAHMA_LINK` to bake in the funnel URL). `make package
      TRACK=out/x.wav [TITLE="…"] [LINK=…]` (`tools/package.sh` →
      `videotrack.sh --attribution --title --cover`). *Composes with `make
      track`/`make stemtrack`; verified on-machine.*
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
