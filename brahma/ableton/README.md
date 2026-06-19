# Brahma Bridge — Ableton Live Extension

Absorbs the active **Live Set** (transport, tracks, clips, devices) and
re-expresses it inside the Brahma Meta-Rack. Live becomes a *donor identity*
that the organism wears — the same parasitic-symbiotic move the rack makes
with every other system it touches.

Built for the [Ableton Extensions SDK](https://ableton.github.io/extensions-sdk/)
(public beta, **Live 12.4.5+**), a Node.js/JavaScript toolkit that exposes the
structure of a Live Set: tracks, clips, MIDI, devices, parameters, automation
and tempo.

## What it does

On each broadcast tick (default 10 Hz) the extension reads the Set and streams
OSC to SuperCollider on `127.0.0.1:57120` — the same port the Pure Data surface
and Visual Cortex use to reach SC:

| OSC address              | Args                                                        | Effect in Brahma |
|--------------------------|-------------------------------------------------------------|------------------|
| `/ableton/absorb`        | `setName:str`                                               | Begin wearing the Set |
| `/ableton/transport`     | `playing:int tempo:float songTime:float loop:int`           | Drives CHRONOS tempo (+ Ableton Link if running) |
| `/ableton/set/structure` | `tracks audio midi scenes devices clips` (int)              | Registers the **Ableton** organism (entity `1003`) via AdamKadmon |
| `/ableton/track`         | `index name muted soloed armed numClips color`              | Per-track state (reserved for routing) |
| `/ableton/organism/update` | `1003 "Ableton" coherence:float entropy:float`            | Visual Cortex radius/jitter |
| `/ableton/release`       | —                                                           | Shed the Set |

The matching SuperCollider responders live in
`../sc/29_ableton_bridge.scd`; the OSC contract is mirrored in
`src/mapper.js`.

## Structure

```
ableton/
  manifest.json        Extension metadata + user settings
  package.json         npm scripts; SDK packages are vendored (see below)
  src/
    index.js           Entry point — activate/deactivate, observers, tick loop
    live-adapter.js    Live Set API -> plain snapshot (defensive, feature-detected)
    mapper.js          Snapshot -> Brahma trait map + coherence/entropy + OSC
    osc.js             Zero-dependency OSC 1.0 encoder over UDP (dgram)
  test/
    smoke.js           Runs without Live: mock Set -> UDP listener -> assertions
```

## Install (in Live)

1. Join the Live 12 Suite beta and install **12.4.5+**.
2. The SDK ships `@ableton-extensions/sdk` and `@ableton-extensions/cli` as
   local tarballs (not yet on npm). Drop them in `vendor/` and they will be
   picked up via `optionalDependencies` in `package.json`.
3. From this folder: `npm run dev` to load into the running Live extension host
   (hot-reloads), or `npm run package` to produce a distributable bundle.
4. Configure host/port/rate in the extension's settings panel (see
   `manifest.json`).

## Test (no Live required)

```bash
npm test     # or: node test/smoke.js
```

This stands up a real UDP listener standing in for SuperCollider, mocks the
SDK `song` object, drives one broadcast tick, and asserts the OSC packets
decode to the expected addresses and values.

## Notes

- The Live Set accessor names in `live-adapter.js` are read defensively
  (several plausible shapes, falling back to `0`/empty) because the beta API is
  still stabilising — only `context.song` is a hard requirement.
- OSC sends are best-effort (errors swallowed), so a missing SuperCollider
  never disrupts Live, matching the PD and web bridges.
