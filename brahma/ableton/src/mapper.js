"use strict";

/*
 * Live Set -> Brahma translation.
 *
 * These are pure functions so they can be unit-tested without a running
 * copy of Live (see test/smoke.js). A "snapshot" is a plain object produced
 * by src/live-adapter.js from the Extensions SDK Live Set API.
 */

const ABLETON_ENTITY_ID = 1003; // 1001 Relinquished, 1002 Proteus, 1003 Ableton
const ABLETON_TYPE = "Ableton";

function clamp01(x) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/** Map a tempo in BPM (typically 20..300) onto 0..1. */
function tempoToUnit(bpm) {
  return clamp01((bpm - 20) / (300 - 20));
}

/**
 * Derive a 4-key Brahma trait map (AdamKadmon schema) from a Set snapshot.
 * Every value is already normalised to [0,1]; the SC side still re-validates.
 */
function deriveTraitMap(snap) {
  const tracks = snap.tracks || [];
  const numTracks = tracks.length || snap.numTracks || 0;
  const numDevices = snap.numDevices || 0;
  const numClips = snap.numClips || 0;
  const numScenes = snap.numScenes || 0;
  const playingClips = tracks.filter((t) => t.hasPlayingClip).length;
  const armedTracks = tracks.filter((t) => t.armed).length;

  // Diversity: how evenly tracks are split between audio and MIDI.
  const midiTracks = tracks.filter((t) => t.isMidi).length;
  const balance = numTracks > 0 ? midiTracks / numTracks : 0;
  const diversity = 1 - Math.abs(0.5 - balance) * 2; // peaks when 50/50

  return {
    spectral_profile: {
      centroid: tempoToUnit(snap.tempo || 120),
      flatness: clamp01(diversity),
      bandwidth: clamp01(numDevices / 32),
      rolloff: clamp01(numClips / 64),
    },
    temporal_topology: {
      attack: clamp01(snap.tempo ? 1 - tempoToUnit(snap.tempo) : 0.5),
      decay: clamp01(numScenes / 16),
      sustain: clamp01(playingClips / Math.max(1, numTracks)),
      release: clamp01(snap.loopActive ? 0.8 : 0.3),
      slew: clamp01(0.5),
    },
    modulation_graph: {
      sources: numTracks,
      dests: numDevices,
      routes: numClips,
    },
    performance_response: {
      velocity: clamp01(armedTracks / Math.max(1, numTracks)),
      aftertouch: clamp01(playingClips / Math.max(1, numClips)),
      xy_sensitivity: clamp01(numTracks / 32),
      humanize: clamp01(snap.isPlaying ? 0.6 : 0.1),
    },
  };
}

/**
 * Coherence: how "settled" the Set is — playing, looped, with active clips.
 * Mapped 0..1 (Visual Cortex maps this onto a 50..200px radius).
 */
function deriveCoherence(snap) {
  const tracks = snap.tracks || [];
  const numTracks = tracks.length || snap.numTracks || 0;
  const playingClips = tracks.filter((t) => t.hasPlayingClip).length;
  const activity = numTracks > 0 ? playingClips / numTracks : 0;
  const base = snap.isPlaying ? 0.5 : 0.25;
  return clamp01(base + activity * 0.5);
}

/**
 * Entropy: structural complexity / churn — device count and recent edits.
 * Mapped 0..10 (Visual Cortex maps this onto 0..10px of jitter).
 */
function deriveEntropy(snap) {
  const numDevices = snap.numDevices || 0;
  const numClips = snap.numClips || 0;
  const churn = snap.changesSinceLast || 0;
  const raw = numDevices * 0.15 + numClips * 0.05 + churn * 0.5;
  return Math.max(0, Math.min(10, raw));
}

/**
 * Build the full list of OSC messages for one broadcast tick.
 * Returns an array of { address, args } objects.
 */
function buildMessages(snap) {
  const tracks = snap.tracks || [];
  const messages = [];

  // Transport
  messages.push({
    address: "/ableton/transport",
    args: [
      snap.isPlaying ? 1 : 0,
      Number(snap.tempo || 120),
      Number(snap.songTime || 0),
      snap.loopActive ? 1 : 0,
    ],
  });

  // Set structure summary
  messages.push({
    address: "/ableton/set/structure",
    args: [
      tracks.length || snap.numTracks || 0,
      tracks.filter((t) => !t.isMidi).length,
      tracks.filter((t) => t.isMidi).length,
      snap.numScenes || 0,
      snap.numDevices || 0,
      snap.numClips || 0,
    ],
  });

  // Per-track state (capped to keep packets sane on huge Sets)
  tracks.slice(0, 64).forEach((t, i) => {
    messages.push({
      address: "/ableton/track",
      args: [
        i,
        String(t.name || `Track ${i + 1}`),
        t.muted ? 1 : 0,
        t.soloed ? 1 : 0,
        t.armed ? 1 : 0,
        Number(t.numClips || 0),
        Number(t.color || 0),
      ],
    });
  });

  // Derived organism state (drives the Visual Cortex)
  messages.push({
    address: "/ableton/organism/update",
    args: [
      ABLETON_ENTITY_ID,
      ABLETON_TYPE,
      Number(deriveCoherence(snap)),
      Number(deriveEntropy(snap)),
    ],
  });

  return messages;
}

module.exports = {
  ABLETON_ENTITY_ID,
  ABLETON_TYPE,
  clamp01,
  tempoToUnit,
  deriveTraitMap,
  deriveCoherence,
  deriveEntropy,
  buildMessages,
};
