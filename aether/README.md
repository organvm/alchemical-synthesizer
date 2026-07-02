# AETHER — the living radio

> A distinct **product** that currently lives inside this repository. AETHER is the
> 24/7 self-broadcasting radio: it tunes external sources, transmutes them through the
> Brahma engine, and streams the result as live HLS (with an RTMP rebroadcast lure and
> a public waitlist funnel). **Brahma** (the audio synthesizer + the Foundry product
> surface) and **AETHER** (this streaming service) are two products that share the
> engine but are otherwise separate concerns.

This directory is AETHER's **module home**: the place the repository formally acknowledges
AETHER as its own modular bit. The code itself is still co-located across the Brahma tree
(the AETHER radio worker deliberately builds from the repo root so it can bundle assets from
`brahma/web/…`), so this module is declared here and mapped in [`MANIFEST.md`](MANIFEST.md)
rather than physically consolidated — see the honest note below.

## What AETHER is

| Piece | Where it lives today | Role |
|-------|----------------------|------|
| Deploy unit | [`deploy/aether/`](../deploy/aether/) | Cloudflare **Containers** worker for the 24/7 radio (`aether-radio`), R2 segment bucket, `serve.js`, `Dockerfile`, `entrypoint.sh` |
| Broadcast tooling | `tools/broadcast.sh`, `tools/rebroadcast.sh`, `tools/hls_append.py`, `tools/ingest_queue.py`, `tools/r2_sync.sh`, `tools/cellcycle.py`, `tools/lineage.py`, `tools/tune.py` | Segmented-NRT → live HLS, RTMP push, station tuning, ingest queue, lineage |
| Web UI | [`brahma/web/public/aether/`](../brahma/web/public/aether/) | The listener page (`aether.js`, `index.html`) |
| Stations | [`stations.json`](../stations.json) | The tunable source registry |
| Plan / docs | [`docs/AETHER-BROADCAST-PLAN.md`](../docs/AETHER-BROADCAST-PLAN.md) | Broadcast architecture |
| Make targets | `make broadcast`, `make rebroadcast`, `make submit` | Operator entrypoints |

The authoritative, file-level footprint is in [`MANIFEST.md`](MANIFEST.md).

## Why it isn't physically extracted yet (the honest note)

AETHER is *tangled through* Brahma's directories — the radio worker's `wrangler.toml` says it
must build from the **repository root** to bundle `brahma/web/…` assets, and the broadcast
tooling is interleaved with the audio tooling in `tools/`. There is therefore **no single
`git subtree` prefix** to split cleanly. A full extraction must first *consolidate* those
scattered files into this `aether/` prefix and re-wire the deploy build context — which
touches the **live** radio + funnel deploy. That migration is safe to do only against this
repo's own CI + a `wrangler` build check, so it is staged as a recipe rather than done blind
(breaking the live stream would be the wrong kind of "done").

The extraction is a **repeatable recipe**, not a one-off: see [`EXTRACTION.md`](EXTRACTION.md)
for the exact `git mv` set, the reference-update points, the verification gates, and the final
lift into a standalone `aether` repository (the new-repo creation is the one human-gated atom).
