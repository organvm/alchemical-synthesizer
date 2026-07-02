# 🜔 Brahma — the substrate

**Kind:** shared library (not a product). **Lane:** `feat(brahma):`.
Registered in [`../ORGANS.md`](../ORGANS.md).

The alchemical synthesizer itself — the instrument this whole repo grew from. It
absorbs, mutates, and re-expresses the identities of other systems through a
strict 7-stage biological signal path (Assimilation → Gating → Binding →
Extraction → Transmutation → Protection → Release).

## What it owns (this directory)

| Path | Role |
|------|------|
| `sc/` | SuperCollider — the DSP engine + NRT renderers (`13_nrt_renderer.scd`, `14_stem_voices.scd`). |
| `pd/` | Pure Data — performance UI / visual patching (optional). |
| `ableton/` | Ableton Bridge (Extensions SDK) — `manifest.json` + activation/release. |
| `web/` | Etz Chaim **Visual Cortex** — the p5 tree that Forge renders and Aether streams. |

## Boundary

- Brahma **depends on nothing downstream.** It never imports from `forge/`,
  `tools/`, or `deploy/aether/`.
- Both other organs consume it: **Forge** renders audio *through* `brahma/sc/*`,
  **Aether** streams `brahma/web` assets (its container bundles them from repo
  root — see the Aether manifest).
- Adding a creature, an operator, or a Visual-Cortex vessel is a Brahma change,
  even when a Forge or Aether feature motivated it.

## Owned remaining work

None specific to lane hygiene — Brahma is already a self-contained directory. Its
product/release roadmap lives in `../ROADMAP.md` and `../seed.yaml`.
