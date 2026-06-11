# Praxis — The Remediation Plan

> *The attack vectors for evolution. How the distance between [pragma.md](pragma.md)
> and [telos.md](telos.md) is closed, in order.*

The single fact that governs everything below: **the instrument cannot honestly
absorb until it can honestly measure.** The Analysis-Extraction (AE) stage and
the `~METRIC_COLLECTOR` placeholders are the load-bearing gap. Every other
ambition is downstream of fixing them.

## Vector 1 — Make Measurement Real (critical)

Replace the placeholder metric dimensions with genuine DSP.

- Integrate **FluidBufSpectralShape** (Fluid Corpus Manipulation toolkit) to
  compute real **Coherence** (spectral stability) and **Entropy** (Shannon
  entropy of the spectral distribution).
- Implement **Fidelity** as a true cross-correlation between AE input and TE
  output, so absorption quality is observed rather than asserted.
- Promote these from `~METRIC_COLLECTOR` Event placeholders to validated
  measurements feeding `AdamKadmon.validateTraitMap` (strictness threshold 0.85).

*Unblocks:* honest trait maps, meaningful A/B test bench results, trustworthy
organism telemetry on the Web Cortex.

## Vector 2 — Deepen Trait Extraction (high)

With real spectral analysis in hand, expand the AE stage from shallow
descriptors to the full four-key trait schema —
`[spectral_profile, temporal_topology, modulation_graph, performance_response]`
— so that what an organism "wears" is structurally faithful to its donor, not a
caricature.

## Vector 3 — Close the Roadmap Phase-1 Items (high)

From `ROADMAP.md`, still open:

- [ ] Multi-channel specimen recording.
- [ ] Expanded Trait Mapping (FluidBuf integration) — folds into Vector 1/2.

## Vector 4 — Propagation Surfaces (medium)

`ROADMAP.md` Phase 2:

- Distributed OSC backplane (extend `BridgeRouter` beyond localhost).
- **VCV Rack integration layer** — the most direct path to external adoption,
  exposing Brahma organisms as patchable modules in an existing ecosystem.

## Vector 5 — Ship a Launchable Build (medium)

`pragma.md` notes there is no one-command launch. Provide a scripted boot
(symlink installer + layered start) so the stranger test — *can someone who is
not the author run this?* — passes without tribal knowledge.

## Vector 6 — Surface the Domains (this layer)

Manifest the product beyond its source tree:

- **Academic surface** ([../surfaces/academic.md](../surfaces/academic.md)) —
  position the work as a research contribution on adaptive/parasitic synthesis.
- **Market surface** ([../surfaces/market.md](../surfaces/market.md)) —
  position it for instrument-makers, modular performers, and creative coders.
- **Content/Community pillars** — `ecosystem/pillar-dna/` lists both at
  *conception*; a docs site and process reference are the next concrete arms.

## Sequencing

```
Vector 1 ──▶ Vector 2 ──▶ Vector 3
   │                          │
   └────────────▶ Vector 4 ◀──┘
                     │
            Vector 5 ─┴─ Vector 6 (parallel, doc-only)
```

Vectors 5 and 6 are doc/packaging work and can run in parallel with the DSP
chain. Everything sensory waits on Vector 1.

> *"If it is not on the Roadmap, it does not exist."* — these vectors are the
> Roadmap made explicit.
