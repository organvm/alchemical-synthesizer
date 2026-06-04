"use strict";

/*
 * Adapter between the Ableton Extensions SDK Live Set API and the plain
 * "snapshot" objects consumed by src/mapper.js.
 *
 * The Extensions SDK (public beta, Live 12.4.5) exposes the Live Set through
 * a `song` object with collections such as `song.tracks`, per-track
 * `track.clipSlots` / `track.devices`, and transport fields like
 * `song.tempo` / `song.isPlaying`. The exact accessor names are still
 * stabilising during the beta, so every read here is defensive: we probe a
 * couple of plausible shapes and fall back to 0/empty rather than throwing.
 * Centralising that here keeps mapper.js pure and keeps index.js readable.
 */

function read(obj, ...names) {
  if (!obj) return undefined;
  for (const name of names) {
    const v = obj[name];
    if (typeof v === "function") {
      try {
        return v.call(obj);
      } catch (_) {
        /* try next */
      }
    } else if (v !== undefined && v !== null) {
      return v;
    }
  }
  return undefined;
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v.length === "number") return Array.from(v);
  if (v && typeof v.toArray === "function") {
    try {
      return v.toArray();
    } catch (_) {
      /* fall through */
    }
  }
  return [];
}

function snapshotTrack(track) {
  const clipSlots = asArray(read(track, "clipSlots", "clip_slots"));
  const devices = asArray(read(track, "devices"));
  const filledSlots = clipSlots.filter((s) => read(s, "hasClip", "has_clip", "clip"));
  const playing = clipSlots.some((s) => {
    const clip = read(s, "clip");
    return clip && read(clip, "isPlaying", "is_playing");
  });
  return {
    name: read(track, "name") || "",
    isMidi: Boolean(read(track, "hasMidiInput", "has_midi_input", "isMidi")),
    muted: Boolean(read(track, "mute", "muted")),
    soloed: Boolean(read(track, "solo", "soloed")),
    armed: Boolean(read(track, "arm", "armed", "isArmed")),
    color: Number(read(track, "color") || 0),
    numClips: filledSlots.length,
    numDevices: devices.length,
    hasPlayingClip: playing,
  };
}

/**
 * Build a snapshot of the whole Set from a `song` object.
 * @param {object} song  Extensions SDK Live Set / song object
 * @param {number} changesSinceLast  edit count since the previous snapshot
 */
function snapshotSet(song, changesSinceLast = 0) {
  const trackObjs = asArray(read(song, "tracks"));
  const tracks = trackObjs.map(snapshotTrack);
  const numDevices = tracks.reduce((n, t) => n + (t.numDevices || 0), 0);
  const numClips = tracks.reduce((n, t) => n + (t.numClips || 0), 0);

  return {
    tempo: Number(read(song, "tempo") || 120),
    isPlaying: Boolean(read(song, "isPlaying", "is_playing")),
    loopActive: Boolean(read(song, "loop", "loopActive", "isLoopOn")),
    songTime: Number(read(song, "currentSongTime", "songTime", "current_song_time") || 0),
    numScenes: asArray(read(song, "scenes")).length,
    numTracks: tracks.length,
    numDevices,
    numClips,
    tracks,
    changesSinceLast,
  };
}

module.exports = { snapshotSet, snapshotTrack, read, asArray };
