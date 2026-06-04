# Market Surface — The Alchemical Synthesizer as Product

> *Domain implementation: market. The instrument re-framed for the people who
> would play it, build on it, or release with it. A positioning surface, not a
> sales sheet — every claim traces to [pragma.md](../logos/pragma.md).*

## One Line

**An instrument with no voice of its own — it becomes whatever you feed it.**
Brahma is a modular synthesis organism that absorbs the *structural identity* of
other gear and re-expresses it across 300+ modules under live performance
stress.

## The Problem It Addresses

Synthesizers are sold as fixed voices. A player accumulates many of them to
cover sonic range, and each one is a static identity you patch *around*. There
is no instrument designed around the act of *transformation itself* — taking a
source you already own and metabolizing it into something new, repeatably, on
stage.

## The Wedge

Brahma's wedge is **identity-by-absorption**, expressed through three
distinctive mechanics drawn from its design lineage:

- **Single-Equip wearing** — bind one source, *become* its character.
- **Lossless Stacking (FSAP)** — accumulate absorbed identities without
  degrading earlier ones.
- **Reflection** — the instrument defends its own signal, turning stress into
  output rather than collapse.

No mainstream synth or modular system frames itself this way. The nearest
neighbours each cover only a slice.

## Segments

| Segment | What they get | Entry surface |
| :--- | :--- | :--- |
| **Modular / Eurorack performers** | A 300+ module rack (oscillators, filters, FX, sequencing, Make Noise / Elektron-style emulations) with an absorption philosophy on top | SuperCollider engine + Web/PD canvases |
| **Creative coders & SC users** | An extensible organism framework (Adam Kadmon ontology, FSAP, OSC topology) to build new absorbing modules | `brahma/sc/` + [CLAUDE.md](../../CLAUDE.md) |
| **Live-visual / AV artists** | Real-time organism visualization driven by the audio engine (Web Cortex) | `http://localhost:3000` |
| **Researchers / educators** | A worked system about instrument identity and adaptive synthesis | [academic.md](academic.md) |

## Competitive Landscape (orientation, not audit)

Brahma overlaps partially with several categories but is not substitutable by
any single one:

- **Modular software (VCV Rack, SuperCollider, Max/MSP, Pure Data)** — Brahma is
  *built on* this layer (SC + Pd) and would reach this market most directly via
  the planned **VCV Rack integration** ([praxis Vector 4](../logos/praxis.md)).
- **Cross-adaptive / resampling workflows** — Brahma formalizes what performers
  do manually (sample a source, mangle it) into a structured absorb→transmute
  loop.
- **Granular / spectral resynthesis instruments** — adjacent on technique, but
  framed around *texture*, not *identity*.

> A real market-gap analysis (3+ profiled competitors, landscape snapshot) is a
> gate in `ecosystem/pillar-dna/delivery.yaml` and remains to be completed
> before any go-to-market step. This section is orientation only.

## Honest Maturity

Per [pragma.md](../logos/pragma.md): the engine, module catalogue, three
surfaces, and OSC topology are **built and working**. The seams a buyer should
know: three of four self-measurement dimensions are placeholders, trait
extraction is shallow, and boot is multi-step (no one-command launch yet). This
is a **building-stage** product (`ecosystem.yaml`: delivery `in_progress`,
content & community at `conception`), not a shrink-wrapped release.

## Positioning Statement

> *For modular performers and creative coders who are tired of fixed voices,
> the Alchemical Synthesizer is a synthesis organism that absorbs the identity
> of any source you feed it and re-expresses it across hundreds of modules.
> Unlike a conventional synth or a granular resampler, it is built around the
> act of transformation itself — with a disciplined ethics of contamination:
> wear one identity at a time, lose nothing you have absorbed, and reflect what
> threatens you.*

## Path to Market (sequenced)

1. **Stranger-testable build** — scripted boot so a non-author can run it
   ([praxis Vector 5](../logos/praxis.md)).
2. **VCV Rack integration** — meet performers in an ecosystem they already use
   ([Vector 4](../logos/praxis.md)).
3. **Docs site + process reference** — the content pillar's first arm
   (`ecosystem.yaml` content: `not_started`, high priority).
4. **Demo specimens** — publish NRT-rendered before/after absorption artifacts
   as the most legible proof of the wedge.

---

*This surface positions; it does not promise. Update it from
[pragma.md](../logos/pragma.md), never the other way around.*
