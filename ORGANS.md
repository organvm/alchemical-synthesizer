# ORGANS.md — the organ-lane registry

This repository began as a single instrument — the **Brahma Meta-Rack**
(`README.md`) — and grew three distinct organs. This file is the **authoritative
boundary map**: what each organ is, where it lives, what it *owns*, and what it
*shares*. It complements the two existing top-level manifests rather than
competing with them:

- `ecosystem.yaml` — how the repo delivers to the outside world (release, docs).
- `seed.yaml` — the automation contract (SENSORIA sprint, artifacts, CI).
- **`ORGANS.md` (this file)** — how the concerns *inside* the repo are separated.

## The one rule

> **Each organ owns its domain. They share the Brahma substrate — and nothing
> else. New work flows into exactly one lane.**

The commit history already speaks in lanes; keep the prefixes:

| Prefix | Organ | Kind |
|--------|-------|------|
| `feat(brahma):` | **Brahma** — the synthesizer engine + Visual Cortex | substrate (shared library) |
| `feat(forge):`  | **Forge** — audio → shippable track + visual | pipeline (tool) |
| `feat(aether):` | **Aether** — Brahma's living 24/7 radio | product (deploy unit) |

The dependency arrow points one way: **Forge → Brahma** and **Aether → Brahma
(+ Forge output)**. Brahma depends on nothing downstream. A change that makes
Brahma reach *up* into Forge or Aether is a lane violation.

## The three organs

### 🜔 Brahma — the substrate (shared)
The alchemical synthesizer itself: the 7-stage biological signal path
(SuperCollider / Pure Data / Ableton) plus the Etz Chaim **Visual Cortex** (web).
Every other organ draws on Brahma; Brahma is a library, not a product.
**Home:** `brahma/` · **Manifest:** [`brahma/ORGAN.md`](brahma/ORGAN.md)

### ⚒ Forge — the production pipeline (tool)
Turns any audio into a shippable track + matching visual — the repeatable spine
so a track ships a couple times a week: **ingest → rip (stem separation) → forge
(recombine stolen stems) → render (NRT bounce through Brahma) → visual →
package.** **Home (target):** `forge/` · **Manifest:**
[`forge/ORGAN.md`](forge/ORGAN.md)

### 📡 Aether — the broadcast product (product)
Brahma's living radio: **capture → generative broadcast → HLS → 24/7 sovereign
host (Cloudflare Containers + R2) → RTMP reach → Ouroboros (viewers feed the
organism) → funnel.** Declared a bounded module in #33.
**Home:** `deploy/aether/` (complete deploy unit) · **Manifest:**
[`deploy/aether/ORGAN.md`](deploy/aether/ORGAN.md) · **Plan:**
`docs/AETHER-BROADCAST-PLAN.md`

## Tool ownership map

Every script in `tools/` belongs to exactly one lane. "Deploy-coupled" means the
live AETHER container (`deploy/aether/Dockerfile`, build context = repo root)
bundles or executes it — so it **cannot move** until the container build is
rewired *and re-verified behind the paid `L-MEDIA-ARK-HOST` lever*.

| Tool | Organ | Coupled? |
|------|-------|----------|
| `brahma/` (sc · pd · ableton · web) | Brahma | consumed by Aether container (`brahma/web`) |
| `forge/ingest.sh` | Forge | — |
| `forge/rip.py` | Forge | — |
| `forge/forge.sh` | Forge | — |
| `forge/stemforge.py` | Forge | — |
| `forge/bounce.sh` | Forge | reused by Aether (`broadcast.sh` NRT tier, SC-gated) — Dockerfile COPYs it |
| `forge/tune.py` | Forge | reused by Aether (`broadcast.sh` submission capture) — Dockerfile COPYs it |
| `forge/validate_audio.py` | Forge | — |
| `forge/analyze_audio.py` | Forge | — |
| `forge/render_video.mjs` | Forge | — |
| `forge/videotrack.sh` | Forge | — |
| `forge/package.sh` | Forge | — |
| `forge/setup-demucs.sh` | Forge | — |
| `forge/setup-video.sh` | Forge | — |
| `tools/broadcast.sh` | Aether | **live container** |
| `tools/cellcycle.py` | Aether | **live container** |
| `tools/hls_append.py` | Aether | **live container** (called by `broadcast.sh`) |
| `tools/r2_sync.sh` | Aether | **live container** (`entrypoint.sh`) |
| `tools/ingest_queue.py` | Aether | **live container** (`serve.js`) |
| `tools/rebroadcast.sh` | Aether | — (host-side RTMP "Reach") |
| `tools/lineage.py` | Aether | — (host-side Ouroboros) |
| `tools/smoke.sh` | **shared** | whole-repo smoke harness |
| `tools/gen_test_tone.py` | **shared** | test-signal generator |
| `tools/build_release.sh` | **shared** | repo release infra (`ci.yml` / `release.yml`) — do not move |

## Consolidation — owned, staged, gated (not blind-moved)

The tools are **path-coupled**: scripts call their siblings by literal `tools/X`
strings (`smoke.sh` alone has 22 such references), and they are cited from the
`Makefile`, `ROADMAP.md`, `product/`, and the AETHER deploy. So physical
consolidation is a three-step untangle, not a `git mv`:

1. **Make the boundaries authoritative** — this registry + the per-organ
   manifests (landed in #34). No file moved; zero risk to the live radio, `make`,
   or CI.
2. **Decouple references** — update every `tools/X` reference to the moved
   tool's new lane path in lockstep across callers and sibling scripts.
3. **Move into lanes** — `git mv` per organ.

Each organ owns steps 2–3 for its own tools in its manifest — nothing is parked
here or in anyone's head:

- **Forge** consolidation is **done** — all 13 tools now live in `forge/`; the
  `Makefile`, `ROADMAP.md`, `product/`, and the moved scripts' own sibling calls
  were updated in lockstep and verified with `make -n` + `make smoke`. One
  wrinkle surfaced and was handled: `broadcast.sh` (Aether) reuses two Forge
  tools at runtime — `forge/tune.py` (submission capture) and `forge/bounce.sh`
  (an SC-gated render tier) — and the container's `COPY tools/` was wholesale, so
  the Dockerfile now also `COPY`s those two into `/app/forge/`. Both calls
  degrade gracefully if absent, and the 24/7 container is not yet deployed
  (gated behind `L-MEDIA-ARK-HOST`), so this carries no live-radio risk — only
  keeps the eventual gated deploy consistent.
- **Aether** consolidation is **gated**: the five container-coupled tools above
  stay in `tools/` by design until the container build is rewired *and* proven
  behind `L-MEDIA-ARK-HOST`. Owned in `deploy/aether/ORGAN.md`.
- **Shared** tools stay in `tools/` permanently — they are genuinely cross-organ.
