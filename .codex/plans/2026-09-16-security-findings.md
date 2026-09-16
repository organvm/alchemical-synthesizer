# Current-source security repair

Owner: this repository security repair PR. Baseline: 8de2bd7bdbc075a8971e5de224bed5d020b0d8f4.

Both application lockfiles retained osc 2.4.5 with its exact ws 8.18.0 dependency, despite patched direct ws dependencies. Apply an osc-scoped override to ^8.21.3 in each application; regenerate the affected dependency edge and retain unrelated locked versions. The npm lock-only update initially retained an invalid nested dependency; remove that stale lock entry and regenerate, then verify from clean installations.

Evidence: npm ci --ignore-scripts --no-audit --no-fund passed in product and brahma/web; npm ls ws passed in both, with osc deduplicated to ws 8.21.3. Product node bin/smoke.js passed 21 checks, zero failed, bounded by a 90-second subprocess deadline. These are local source checks, not relay execution, deployment, hosted scan clearance, or full security acceptance.

Upstream security references:
- https://github.com/websockets/ws/security/advisories/GHSA-96hv-2xvq-fx4p
- https://github.com/advisories/GHSA-73jw-fp74-p77x

Next source obligations: reproduce and repair current ACP parsing complexity, static serving containment, dashboard persistent key storage, and REST resource rate limits. Preserve all other alert obligations in the health denominator. Obtain exact-head hosted scan results through the declared integration rail; do not dismiss alerts based only on local installation success.
