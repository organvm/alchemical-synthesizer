# AETHER — free funnel (Cloudflare Pages)

The static radio-station home (`product/public/home`) + a waitlist capture
Function, deployed to Cloudflare Pages at **$0**. This is the *demand-before-rails*
step: it captures interest **first**; the paid 24/7 sovereign stream
(`deploy/aether`, the `$5/mo` `L-MEDIA-ARK-HOST` lever) turns on when demand
justifies it.

```
deploy/funnel/
  wrangler.toml                 name=aether, KV binding, pages_build_output_dir
  functions/api/v1/waitlist.js  POST -> append signup to AETHER_WAITLIST KV
  deploy.sh                     assemble ./public from source, then deploy
  public/                       assembled at deploy time (gitignored)
```

## Deploy

```bash
deploy/funnel/deploy.sh            # build + deploy to production
deploy/funnel/deploy.sh --dry-run  # assemble ./public only
```

Auth is non-interactive via `CLOUDFLARE_API_TOKEN` (organ-hydrated in
`~/.limen.env` by `creds-hydrate.py`) — no `wrangler login`. The token value is
never printed.

## The captured demand (private, sovereign)

Signups live in the **AETHER_WAITLIST** KV namespace in the owner's own
Cloudflare account — private, access-controlled, never exposed over HTTP
(`GET /api/v1/waitlist` is `405`). Read the list back, authenticated:

```bash
# NOTE: --remote is REQUIRED. wrangler v4 defaults kv commands to a LOCAL
# miniflare store; the deployed Function writes to REMOTE KV. Without --remote
# you read an empty local store and think capture is broken (it isn't).
wrangler kv key list --namespace-id f3cace328f18435e913cdcf2498e4a47 --remote
wrangler kv key get "wl:<email>" --namespace-id f3cace328f18435e913cdcf2498e4a47 --remote
```

## Still human-gated (surfaced, not actioned)

- **The 24/7 live stream** — the funnel's player has no stream until the paid
  container is up (`deploy/aether`, `$5/mo` Workers-Paid `L-MEDIA-ARK-HOST`).
  The page degrades gracefully to "launching soon / join the waitlist".
- **Custom domain** — optional; `aether.pages.dev` works as-is. A vanity domain
  is a registrar/DNS atom, not required to capture demand.
