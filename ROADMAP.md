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
### AETHER — a living radio: Brahma listens, transmutes, broadcasts
> The evolution of "Funnel" (2026-07-02): the alchemical synthesizer becomes a
> transceiver. It **listens** to free/live web audio, **transmutes** it through
> the Forge, and **broadcasts** its own generative, evolving stream — whose home
> page *is* the funnel (live player + demand capture + the packaged-track archive).

> **Full plan (all paths, to the omega):** [`docs/AETHER-BROADCAST-PLAN.md`](docs/AETHER-BROADCAST-PLAN.md)
> — grounded in the genesis design corpus (`docs/logos/*`, `docs/design/*`) and an excavation of
> deployed streaming machinery across the ecosystem (converge, don't rebuild).

- [x] **Listen** — sample live/free web audio (internet-radio streams +
      public-domain / CC0 archives) into a Forge-ready WAV. `tools/tune.py` +
      `stations.json` (a license-tagged source registry) + `make tune`/`make
      stations`. Every capture writes a provenance sidecar (`<out>.source.json`)
      and is license-gated: `--publish-safe-only` refuses anything not
      public-domain/CC0/CC-BY/own, so an automated cadence can only pull
      clearable material. *Verified on-machine: a 3 s capture from a live icecast
      stream → SPECIMEN VIABLE through `validate_audio.py`, flows into `make
      rip`/`make track`. Rights posture stays human-gated — the tool records the
      license, it does not grant clearance.*
- [x] **Broadcast (local)** — *[increment 1]* a continuous *generative* Brahma
      performance. `tools/cellcycle.py` is the **METABOLISM organism** (the one
      genuinely new muscle): it carries state forward across segments and walks
      the owner's own arc **READABLE → CLUSTER → DISPERSAL → rebirth** ("bulks up
      then sheds"), emitting each segment's genome + **provisional**
      coherence/entropy (honesty seam intact). `tools/broadcast.sh` renders each
      segment in three graceful tiers — SuperCollider NRT re-expression when
      present, else a folded `tune` donor, else a genome-reactive tone so the
      stream never goes silent — and `tools/hls_append.py` rolls it into a
      **LIVE HLS** playlist (the `vod → event`/rolling flip = no `#EXT-X-ENDLIST`
      + rolling `#EXT-X-MEDIA-SEQUENCE` + chunk eviction). The grafted
      **theatron** player (`brahma/web/public/aether/`, HLS.js + Safari-native
      fallback) attaches at `/aether` and renders the organism's live inner life;
      `server.js` serves it at `/live` (no-cache playlist, `video/mp2t` chunks)
      and now survives an OSC-port conflict instead of crashing. `make broadcast`.
      *Verified on-machine end-to-end with ffmpeg (real AAC/TS chunks, live
      rolling window, eviction, media-sequence) + `cellcycle`/`hls_append`
      self-tests in smoke; NRT path is SC-gated (SC not installed here, same as
      `bounce.sh`). Going public is the deploy gate (increments 2–3).*
- [x] **Home = live player + funnel** — *[increment 2]* the landing page is now
      Brahma's radio station (`product/public/home/`, static + config-driven so it
      deploys to CF Pages/Vercel **or** is served by the Foundry at `/`): live
      HLS player + provisional organism overlay on top, the packaged-track
      **archive** below (live from `/api/v1/specimens`, static `archive.json`
      fallback), and the **waitlist** capture (`POST /api/v1/waitlist`). The
      audio `501` stub at `product/src/api/rest.js:65` is **wired** — real
      specimen files stream with HTTP **Range** support (206) and path-traversal
      safety, absolute `audioUrl`s 302-redirect to a CDN, simulated → 409, missing
      → 404. Every backend call degrades gracefully (a pure-static deploy still
      captures demand). *Verified: Foundry smoke 21/21 (incl. home + audio
      stream/Range/409/404); live boot serves `/`, its assets, `/pricing`,
      `/dashboard`, `/live`, and `/api/v1/specimens` all 200.* The first public
      **deploy** stays the human-gated atom; no payment rail until a real buyer.
- [x] **24/7 sovereign host** — *[increment 3]* the generator is containerized as
      a complete Cloudflare Containers deploy unit (`deploy/aether/`): a
      `Dockerfile` (ffmpeg + python3 + node, **no** SuperCollider — the fallback
      tiers keep it live, so the image is small/reliable) runs `broadcast.sh` +
      a **dependency-free** `serve.js` (node builtins only — no `npm install`, no
      native builds); a `worker.mjs` fronts the container and serves durable
      segments from **R2** (`tools/r2_sync.sh` is the container→R2 write path,
      creds via env, never recited); `wrangler.toml` wires the container + DO +
      R2 bucket. *Verified: `serve.js` serves player + `/live` on-machine
      (correct MIME/no-cache, traversal blocked); `wrangler.toml` valid TOML,
      `worker.mjs`/`serve.js` parse, `entrypoint.sh`/`r2_sync.sh` `bash -n` clean
      — all in smoke.* Human-gated atoms (each one action, in `README.md`):
      `L-MEDIA-ARK-HOST` ($5/mo Workers Paid), `wrangler login`, `r2 bucket
      create`, `wrangler deploy`; optional R2 write creds.
- [x] **Playable / realtime** — *[increment 4]* the "mess around with it live"
      surface (`brahma/web/public/instrument/`, at `/instrument`): a
      **tracker-brained, Ableton-bodied** sampler instrument. `pattern.js` is the
      backend-agnostic brain (node-tested): the per-cell command language
      (`RT`/`ST`/`OV`/`HU`/`DN`), the owner's generative arc **READABLE → CLUSTER
      → DISPERSAL** (same metabolism as `cellcycle.py`), and mutable `scene` vs
      immutable `scene_version` (freeze a specimen). `instrument.js` is the
      WebAudio body driving it through an **injectable render adapter** — a local
      WebAudio synth **or** an `OSC → SuperCollider` adapter over the existing
      Cortex bridge (control needs no device) — plus a live analyser "orb"
      visual. *Verified: `pattern.js --self-test` (commands, arc, determinism,
      scene_version) + `node --check` in smoke.* Device-gated extensions
      (deferred): realtime scsynth **audio capture** (needs BlackHole/JACK) and a
      full THREE.js 3D orb.
- [x] **Reach** — *[increment 5]* a one-way RTMP re-broadcast **lure**:
      `tools/rebroadcast.sh` re-encodes the sovereign HLS stream to FLV/RTMP and
      pushes it to YouTube/Twitch, converging the `remote-broadcast.json` contract
      (`deploy/aether/rebroadcast.json`: bitrate ladder + audio chain +
      endpoints). Since the stream is audio-first, ffmpeg **synthesizes** the
      required video track from the audio (showspectrum / showwaves / showcqt) —
      no separate render. The stream key is an organ-owned credential (env
      `RTMP_KEY`, never recited); absent key → refuses (exit 4). `make
      rebroadcast TARGET=youtube` | `DRYRUN=…` for a keyless local preview.
      *Verified: `--dry-run` produces a real H.264+AAC FLV (showspectrum +
      showwaves), no-key refusal, `bash -n` + contract-valid + dry-run encode all
      in smoke.* The sovereign HLS stream stays the home; the RTMP push is the
      lure. First live push needs the platform stream key (the one gated atom).
- [x] **Ω — Ouroboros** — *[increment 6]* the omega, and it reuses everything:
      viewers submit a stream URL (`POST /submit` on the live host, or `make
      submit`) → it lands in the queue authority (`tools/ingest_queue.py`) →
      `broadcast.sh` pops it → `tune.py` captures it → **a creature eats it
      live**. The `--ouroboros` flag re-feeds Brahma's *own* prior output as a
      donor ("output re-enters as input"). Every absorption is chained in the
      **lineage** ledger (`tools/lineage.py` → `lineage.json`: id/epoch/fidelity/
      source/license/creature/**parent**), browsable in the theatron player's
      Ω panel. Also fixed `tune.py` to accept non-network inputs (its HTTP
      `-reconnect` flags rejected local/file donors). *Verified end-to-end: a
      seeded submission absorbed (parent=genesis), self-consumption chained
      seg0→seg2→seg5, `POST /submit` enqueues (bad URL → 400), and
      ingest_queue/lineage self-tests + an Ouroboros integration test all pass in
      smoke. On this machine the absorbed segments render via **real
      SuperCollider NRT** (bounce.sh discovers SC via app-bundle paths that
      `command -v` misses — the earlier "SC-gated" note was conservative).*
      Substrate-agnostic (non-audio) absorption is the far seam (the queue carries
      a `kind` field for it).

**Human-gated decision atoms** (do not silently decide):
- **Rights posture** — commercially sampling copyrighted songs *or radio/stream
  captures*. Safe default in the tooling: the pipeline runs on *any* input, but
  anything **published/sold** uses rights-cleared source (your own / CC0 /
  licensed) or unrecognizably transformed material; recognizable rips stay
  private R&D until cleared. *Now partly operationalized:* `stations.json` tags
  each source's license and `tune.py --publish-safe-only` enforces the
  public-domain/CC0/CC-BY/own set — but the **policy** (what you actually publish)
  remains yours.
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
