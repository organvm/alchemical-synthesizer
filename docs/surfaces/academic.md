# Academic Surface — The Alchemical Synthesizer as Research Contribution

> *Domain implementation: academic. The instrument re-framed as a contribution
> to the literatures of new interfaces for musical expression (NIME),
> computer music, and adaptive/generative systems.*

This surface positions the Brahma Meta-Rack for a research audience. It is
written so that its claims are traceable to [the honest account](../logos/pragma.md);
where the work is incomplete, it is named as future work rather than result.

## Abstract

We present the **Alchemical Synthesizer (Brahma Meta-Rack)**, a modular
synthesis system framed not as a fixed instrument but as a *parasitic-symbiotic
organism* whose voice is contingent on contact. Rather than emulating target
timbres directly, each module derives a normalized **trait map** —
`[spectral_profile, temporal_topology, modulation_graph, performance_response]`
— from a donor source and re-expresses those structural traits under systemic
stress. The architecture imposes a uniform seven-stage organism path
(Assimilation → Gating → Binding → Extraction → Transmutation → Protection →
Release) across ~317 synthesis modules, governed by an ontological registry
(Adam Kadmon) that validates and normalizes all trait maps, and a strict
absorption state machine (FSAP) that guarantees lossless cumulative integration.
We describe the design rationale, the implemented system across SuperCollider,
Pure Data, and a Node/p5.js visualization layer, and the open measurement
problem that currently bounds the approach.

## Positioning & Related Work

The contribution sits at the intersection of several established threads:

- **Adaptive / cross-adaptive audio effects** — systems whose parameters are
  driven by analysis of an incoming signal. Brahma generalizes this from
  parameter control to *identity assumption*: the analysis (AE stage) produces a
  trait map that an organism *wears*, not merely a control envelope.
- **Live-coding & SuperCollider ecosystems** — the engine is built in
  SuperCollider with custom classes; it inherits that community's idioms while
  adding a biological state-machine layer.
- **Audio descriptors / MIR for synthesis** — trait extraction is a descriptor
  problem; the planned FluidBufSpectralShape integration aligns the system with
  the Fluid Corpus Manipulation (FluCoMa) line of work.
- **NIME & instrument identity** — the central research question — *can an
  instrument's identity be defined by what it absorbs rather than what it is?* —
  is a contribution to ongoing NIME discourse on instrumentality and agency.

> *Researchers extending this surface should ground these threads in the live
> literature (NIME proceedings, ICMC/SMC, JNMR, FluCoMa publications, and the
> cross-adaptive processing corpus) before any external submission. The
> repository ships an arXiv/paper-search-capable toolchain; use it to populate a
> formal bibliography rather than asserting citations here.*

## Novel Claims (and their status)

| Claim | Status | Evidence locus |
| :--- | :--- | :--- |
| A uniform 7-stage organism path can host heterogeneous synthesis modules | **Implemented** | `brahma/sc/` group hierarchy `root→ia→bc→ae→te→pr→rr` |
| Trait maps can be validated/normalized by a single ontological authority | **Implemented** | `AdamKadmon.sc` (threshold 0.85) |
| Cumulative absorption can be made provably lossless via state-machine invariants | **Implemented (logic)** | `FSAP.sc` strict ordering |
| Structural-trait absorption yields perceptually faithful re-expression | **Open** | requires real AE — see below |
| The system's self-measurement is trustworthy | **Open** | 3 of 4 metric dimensions are placeholders |

## Method Sketch

1. **Assimilation/Binding.** A donor signal is normalized and bound to an
   organism core under a Single-Equip constraint.
2. **Extraction.** Spectral and temporal descriptors are computed to populate
   the four-key trait map (target implementation: FluidBufSpectralShape).
3. **Validation.** `AdamKadmon.validateTraitMap` + `normalize` enforce schema
   completeness and `[0,1]` ranges above the strictness threshold.
4. **Transmutation.** Operator-based transformation re-expresses the traits.
5. **Evaluation.** A four-dimensional metric vector — coherence, fidelity,
   stress, entropy — is intended to quantify the absorption; an A/B test bench
   (`runComparison`, `spawnMutant`) supports controlled variation studies, and
   an NRT renderer produces reproducible *specimens* for offline analysis.

## Threats to Validity (stated plainly)

- **Measurement validity.** Coherence, fidelity, and entropy are currently
  placeholders; only stress (CPU load) is a real measurement. No perceptual or
  signal-level evaluation of absorption fidelity has yet been conducted. This is
  the primary barrier to any empirical claim.
- **Trait-extraction depth.** The AE stage is shallow relative to the four-key
  schema's ambition; derived identities are presently more caricature than
  faithful structure.
- **Reproducibility.** Boot is multi-step and depends on SC class installation;
  a scripted, stranger-testable launch is outstanding.

## Reproducibility Notes

- Engine: SuperCollider v3.13+; `sc3-plugins` optional (Homunculus falls back to
  `CombL`). Class files in `brahma/sc/*.sc` must be installed to the SC
  Extensions dir and the class library recompiled.
- Offline specimen generation: `~NRT_RENDERER.renderSpecimen(in, out)` via the
  Score system yields deterministic artifacts suitable for analysis.
- Validation utilities: `forge/validate_audio.py`.

## Future Work

The research program is the [praxis vectors](../logos/praxis.md): make
measurement real (Vector 1), deepen trait extraction (Vector 2), then conduct a
perceptual + signal-level evaluation of absorption fidelity across the module
catalogue — the experiment that would convert the *Open* rows above into
*Result* rows.

---

*This surface is a positioning document, not a peer-reviewed paper. Treat every
"Open" row as an honest invitation, and populate citations from live sources
before external use.*
