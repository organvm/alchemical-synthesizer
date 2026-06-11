# Alchemical I/O — Source & Transmutation

> *The narrative of inputs, process, and returns. What the instrument takes in,
> what it does to it, and what it gives back.*

The Alchemical Synthesizer is, at root, a transmutation engine: *prima materia*
in, *specimen* out. This page traces the alchemical I/O of the whole organism —
the literal signal path and the conceptual one — and the lineage that justifies
each transformation.

## Source (Prima Materia)

The instrument accepts as input anything with a sonic identity:

- **Audio sources** — synthesizers, audio devices, effects pedals, field
  recordings, other organisms within the rack.
- **Symbolic sources** — MIDI/MPE gesture, OSC control, sequenced patterns from
  CHRONOS, generative drivers (Lorenz, Markov, cellular automata).
- **Conceptual sources** — the *design precedent* in `docs/design/`: fictional
  absorption mechanics (Relinquished, The Thing, Cell/Buu, Ditto, Agent Smith)
  read as process specifications and translated into DSP.

## Process (The Seven-Fold Transmutation)

Every input is carried through the seven-stage organism path. This is the
alchemical *opus* expressed as signal flow:

| Stage | Alchemical Reading | Technical Act |
| :--- | :--- | :--- |
| **IA** — Assimilation | *Solve* — dissolve the source into safe raw matter | Normalization, input protection |
| **EG** — Gating | *The vessel sealed* | Single-equip constraint state machine |
| **BC** — Binding Core | *Coniunctio* — the wearing of the other | Signal capture, identity binding |
| **AE** — Extraction | *Separatio* — derive essence from accident | Spectral/temporal trait derivation |
| **TE** — Transmutation | *Coagula* — recombine under operators | Operator-based transformation |
| **PR** — Protection | *The reflecting mirror* | Sacrificial buffering, retaliation |
| **RR** — Release | *Projection* — the tincture released | Final routing, bypass, IMMUNE governor |

The trait map derived at AE must pass `AdamKadmon.validateTraitMap` — the four
keys `[spectral_profile, temporal_topology, modulation_graph,
performance_response]`, normalized to `[0,1]`, above the 0.85 strictness
threshold — before the instrument is permitted to *coagulate* it. In
FSAP-compliant organisms, the **observe → absorb → integrate → accumulate**
cycle enforces lossless stacking: no prior absorption is degraded by a new one.

## Return (The Specimen)

What the instrument gives back:

- **Live voice** — the donor identity, re-expressed under transmutation, routed
  through the rack and limited by IMMUNE before any output.
- **Telemetry** — organism state broadcast at 10 Hz to the Web Cortex
  (`/brahma/organism/update [id] [type] [coherence] [entropy]`), making the
  transmutation visible.
- **Specimens** — offline artifacts. `~NRT_RENDERER.renderSpecimen(in, out)`
  processes a source through the Relinquished → Transmuted pipeline as a
  reproducible file: a *fixed record of a contact event*.

## The Lineage as I/O Contract

The fictional ancestors are not decoration; each donates a specific I/O rule:

- **Relinquished (Yu-Gi-Oh!)** — equip one target, *become* its stats, reflect
  damage back. → Single-Equip + PR-stage reflection.
- **The Thing / Rogue** — absorb by contact, wear the form imperfectly. → BC
  binding with fidelity < 1.
- **Cell / Majin Buu** — fusion and absorption-to-grow. → Fusion Core, Typhon
  accumulation.
- **Fidelity Stacking** — lossless cumulative integration. → FSAP invariant.
- **Ditto** — pure mimicry. → high-fidelity emulation path (Proteus).
- **Agent Smith** — self-replication, signal homogeneity. → enforcement organism.

## I/O at the System Edge

Within ORGANVM, the repository's own alchemical I/O mirrors the instrument's:
it **consumes** theory-artifacts from ORGAN-I as *prima materia* and **produces**
creative-artifacts for ORGAN-III as the returned *tincture*. The instrument and
the repository perform the same opus at different scales.

---

*See [telos.md](telos.md) for why this transmutation matters, and
[pragma.md](pragma.md) for which stages are real today (note: AE trait
derivation is currently shallow — see [praxis.md](praxis.md) Vector 1–2).*
