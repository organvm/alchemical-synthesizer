# Pragma — The Concrete State

> *The honest account of what exists. No aspiration, no marketing — the
> instrument as currently built.*

## What Is Real

The Alchemical Synthesizer is a working multi-layer codebase, not a
single binary. It manifests across four cooperating runtimes glued by OSC:

| Layer | Location | State | Substance |
| :--- | :--- | :--- | :--- |
| **DSP engine** | `brahma/sc/` | Built | ~20,000 LOC, 60+ `.scd` files, 6 `.sc` classes |
| **Performance UI** | `brahma/pd/` | Built | 12 Pure Data patches (8 core + 4 canvas) |
| **Visual Cortex** | `brahma/web/` | Built | Node.js + p5.js, ~5,500 LOC, 3 web surfaces |
| **Validation tools** | `tools/` | Partial | Python audio-specimen utilities |

The SuperCollider engine boots through `loader.scd`, which enforces strict
dependency ordering via numeric file prefixes (`01_*` infrastructure →
`28_*` audio management) inside `s.doWhenBooted` to avoid boot races. The
IMMUNE governor is deployed as the final node in the `\rr` group.

## What Works

- **The 7-stage organism model** is implemented as a real group hierarchy
  (`root → ia → bc → ae → te → pr → rr`) and every shipped module routes
  through it.
- **The core infrastructure classes are real**: `AdamKadmon` (trait
  validation/normalization, capability tokens), `BridgeRouter` (TTL-based
  inter-domain links, 1kHz tick), `FSAP` (strict four-phase absorption state
  machine), plus `BrahmaScale`, `BrahmaMPE`, `BrahmaModBus`.
- **The module catalogue is large and routable**: ~317 SynthDefs spanning 10
  synthesis engines, the absorption organisms, the Golem percussion suite, 49
  effects, Make Noise clones, Elektron emulations, and generative systems —
  all carrying `outBus`/`inBus` arguments for modular patching.
- **The three surfaces exist and talk to each other** over a three-port OSC
  topology (57120 SC→PD, 57121 PD-receive, 57122 SC→Web).

## What Is Placeholder

Honesty requires naming the seams:

- **Measurement is mostly aspirational.** Of the four metric dimensions in
  `~METRIC_COLLECTOR`, only **Stress** (CPU load via `Server.local.avgCPU`) is
  real. **Coherence**, **Fidelity**, and **Entropy** are placeholders awaiting
  a `FluidBufSpectralShape` / FluidBuf integration. The organism's
  self-knowledge is, for now, partly fictional.
- **`sc3-plugins` is not assumed.** The `\homunculus` physical-modeling engine
  falls back to `CombL` instead of `DWGBowed`.
- **Trait derivation (AE stage) is shallow** relative to the telos — real
  spectral/temporal trait extraction is the dependency that unblocks honest
  absorption.

## How It Runs

There is no one-command launch. The system is summoned in layers:

1. SuperCollider IDE → evaluate `brahma/sc/loader.scd` → `--- BRAHMA SYSTEM
   ONLINE ---` (a demo patch auto-plays: Prima Materia + MOIRAI + Euclidean +
   Lorenz + reverb).
2. `cd brahma/web && npm install && npm start` → `http://localhost:3000`.
3. Pure Data → open `brahma/pd/main.pd` (optional, for performance).

The `.sc` class files must be symlinked into the SC Extensions directory and
the class library recompiled before first boot.

## Repository Reality

This is **ORGAN-II (Art)** in the ORGANVM system: status GRADUATED, tier
standard. It consumes theory-artifacts from ORGAN-I and produces
creative-artifacts. The `docs/` tree holds the design-conversation precedent
(`docs/design/`), the absorb/alchemize experiments (`docs/absorb-alchemize/`),
a market pitch (`docs/pitch/`), and — now — this Logos layer.

> The gap between this page and [telos.md](telos.md) is not failure. It is the
> work. [praxis.md](praxis.md) is how it gets closed.
