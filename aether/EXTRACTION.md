# Extracting AETHER into its own repository

A **repeatable recipe**, not a one-off (per the cascade: protocol → precedent → ideal-form).
It runs in two safe, verifiable stages. Do **not** skip the verification gates — AETHER is a
**live** deploy (the 24/7 radio + the public funnel), so a broken build is a broken product.

## Preconditions
- Green on this repo's CI (`.github/workflows/ci.yml`, `ci-minimal.yml`).
- `wrangler` available for the deploy build check (the coupling that must survive the move).
- A clean working tree on a topic branch (`refactor/aether-consolidate`).

## Stage 1 — Consolidate in place (this repo, verifiable here)

Move the [core files](MANIFEST.md#core--aethers-own-code-extraction-candidates) under a single
`aether/` prefix so a later `git subtree split`/`filter-repo` has one clean path.

```bash
git mv deploy/aether                         aether/deploy
mkdir -p aether/tools aether/web aether/docs
git mv tools/broadcast.sh tools/rebroadcast.sh tools/hls_append.py \
       tools/ingest_queue.py tools/r2_sync.sh tools/tune.py \
       tools/cellcycle.py tools/lineage.py                     aether/tools/
git mv brahma/web/public/aether                aether/web/listener
git mv stations.json                           aether/stations.json
git mv docs/AETHER-BROADCAST-PLAN.md           aether/docs/BROADCAST-PLAN.md
```

**Reference-update points** (each must be re-pointed, then verified):
1. `aether/deploy/wrangler.toml` — the build context bundles `brahma/web/…`; move those assets
   into `aether/web/` (or add an explicit copy step) and update the paths. **This is the hard part.**
2. `Makefile` — repoint `broadcast`/`rebroadcast`/`submit`/`tune`/`stations` targets at `aether/tools/…`.
3. `brahma/web/server.js` — the `/aether` route now serves from `aether/web/listener/` (or proxies).
4. `product/**` funnel touchpoints — update any relative links to the listener/radio.
5. Any `tools/broadcast.sh` internal `source`/path references to sibling tools.

**Verification gate (must pass before committing):**
```bash
make stations && make broadcast SECONDS=8 SEGMENTS=2     # local broadcast smoke
( cd aether/deploy && wrangler deploy --dry-run )        # deploy build context survives
# plus the repo CI green on the PR
```

## Stage 2 — Lift into a standalone repo

> **Human-gated atom (the only one):** creating the new `aether` repository. Agent sessions
> cannot create repos (harness policy). Everything up to and after this is automated. Surface it
> as: *"create empty repo `<org>/aether`"* — nothing more.

```bash
# History-preserving split of the consolidated prefix:
git subtree split --prefix=aether -b aether-only
# (or: git filter-repo --path aether/ --path-rename aether/:  for a cleaner root)

# Push into the new repo once it exists:
git push git@github.com:<org>/aether.git aether-only:main
```

Then in the new repo: restore the CF Pages (funnel) + CF Containers (`aether-radio`) deploy from
`aether/deploy/`, wire secrets via the credential organ (never by hand), and leave a one-line
pointer + redirect where AETHER used to live in this repo.

## Rollback
Stage 1 is a pure set of `git mv`s on a topic branch — `git checkout main` abandons it with zero
effect on the live deploy. Nothing here touches production until Stage 2's push + deploy.
