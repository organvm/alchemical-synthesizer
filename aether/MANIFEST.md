# AETHER module manifest

The authoritative, file-level boundary of the AETHER product inside this repository.
Two tiers: **core** (moves into a standalone `aether/` on extraction) and **touchpoints**
(cross-product references that stay with their host but link to AETHER). Keep this in
sync when AETHER files are added or moved — it is the map [`EXTRACTION.md`](EXTRACTION.md)
consumes.

## Core — AETHER's own code (extraction candidates)

### Deploy (already a self-contained subdir)
- `deploy/aether/worker.mjs` — Cloudflare Containers worker (24/7 radio, `aether-radio`)
- `deploy/aether/serve.js` — local/edge server
- `deploy/aether/Dockerfile`, `deploy/aether/entrypoint.sh` — container image
- `deploy/aether/wrangler.toml` — CF Containers + R2 (`aether-segments`) config
  - ⚠️ builds from **repo root** to bundle `brahma/web/…` assets — the key coupling to break on extraction
- `deploy/aether/rebroadcast.json`, `deploy/aether/README.md`

### Broadcast tooling (interleaved in `tools/` with audio tools)
- `tools/broadcast.sh` — segmented-NRT → live HLS (`make broadcast`)
- `tools/rebroadcast.sh` — RTMP push to YouTube/Twitch (`make rebroadcast`)
- `tools/hls_append.py` — HLS playlist/segment append
- `tools/ingest_queue.py` — external-source submit queue (`make submit`)
- `tools/r2_sync.sh` — push segments to R2
- `tools/tune.py` — station tuning + capture (`make tune`, `make stations`)
- `tools/cellcycle.py`, `tools/lineage.py` — generative cycle + lineage
- `tools/smoke.sh` — shared smoke harness (verify AETHER-only usage before moving)

### Listener UI
- `brahma/web/public/aether/aether.js`, `brahma/web/public/aether/index.html`

### Data / docs / config
- `stations.json` — tunable source registry
- `docs/AETHER-BROADCAST-PLAN.md` — broadcast architecture
- `Makefile` targets: `broadcast`, `rebroadcast`, `submit`, `tune`, `stations`

## Touchpoints — cross-product references (stay with host, re-link on extraction)
- `product/server.js`, `product/public/home/{index.html,home.js,style.css,config.js}` — the
  Brahma **Foundry** funnel surfaces the AETHER radio as a feature/link. Stays with `product/`;
  on extraction, repoint at the standalone AETHER URL.
- `product/bin/smoke.js` — Foundry smoke test asserts the AETHER touchpoint.
- `brahma/web/server.js` — serves the `/aether` route from `brahma/web/public/aether/`. On
  extraction, either keep a thin proxy/redirect or move the route into AETHER's own server.

## Not AETHER (guard against over-capture)
- `product/` at large is the **Brahma Foundry** (audio product surface; note: it carries a
  `Stripe-stub` checkout — a separate future MONETA-migration candidate, not part of AETHER).
- `brahma/{sc,pd,ableton}`, `forge/`, and the non-broadcast `tools/*` are the **audio engine**.
