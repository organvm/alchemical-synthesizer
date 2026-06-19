"use strict";

/*
 * Dependency-free smoke test for the Brahma Bridge extension.
 *
 * Runs without Ableton Live: it stands up a real UDP listener (standing in
 * for SuperCollider on 57120), mocks the Extensions SDK `song` object, drives
 * the extension through one broadcast tick, and asserts the OSC packets that
 * arrive on the wire decode back to the expected addresses and values.
 *
 *   node test/smoke.js
 */

const assert = require("assert");
const dgram = require("dgram");

const { encodeMessage } = require("../src/osc");
const { deriveTraitMap, deriveCoherence, deriveEntropy, buildMessages } =
  require("../src/mapper");
const { snapshotSet } = require("../src/live-adapter");
const { BrahmaBridge } = require("../src/index");

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  FAIL ${name}\n       ${e.message}`);
  }
}

// --- Minimal OSC decoder (test-side only) ---------------------------------
function decode(buf) {
  let i = 0;
  const readStr = () => {
    const start = i;
    while (buf[i] !== 0) i += 1;
    const s = buf.toString("ascii", start, i);
    i += 1;
    i += (4 - (i % 4)) % 4;
    return s;
  };
  const address = readStr();
  const tags = readStr();
  const args = [];
  for (const t of tags.slice(1)) {
    if (t === "i") {
      args.push(buf.readInt32BE(i));
      i += 4;
    } else if (t === "f") {
      args.push(buf.readFloatBE(i));
      i += 4;
    } else if (t === "s") {
      args.push(readStr());
    }
  }
  return { address, args };
}

// --- Mock Live Set --------------------------------------------------------
function mockSong() {
  const clip = (playing) => ({ isPlaying: playing });
  const slot = (hasClip, playing) => ({ hasClip, clip: hasClip ? clip(playing) : null });
  return {
    tempo: 128,
    isPlaying: true,
    loop: true,
    currentSongTime: 16.0,
    scenes: [{}, {}, {}, {}],
    tracks: [
      {
        name: "Drums",
        hasMidiInput: true,
        mute: false,
        solo: false,
        arm: true,
        color: 12,
        clipSlots: [slot(true, true), slot(true, false)],
        devices: [{}, {}],
      },
      {
        name: "Bass",
        hasMidiInput: false,
        mute: true,
        solo: false,
        arm: false,
        color: 5,
        clipSlots: [slot(true, false)],
        devices: [{}],
      },
    ],
  };
}

console.log("OSC encoder");
check("encodes address + mixed args round-trips", () => {
  const buf = encodeMessage("/ableton/transport", [1, 128.0, "x"]);
  const { address, args } = decode(buf);
  assert.strictEqual(address, "/ableton/transport");
  assert.strictEqual(args[0], 1);
  assert.ok(Math.abs(args[1] - 128.0) < 1e-3);
  assert.strictEqual(args[2], "x");
});
check("buffer length is 4-byte aligned", () => {
  const buf = encodeMessage("/abc", ["hello", 7]);
  assert.strictEqual(buf.length % 4, 0);
});

console.log("Live adapter + mapper");
const snap = snapshotSet(mockSong(), 3);
check("snapshot reads transport + structure", () => {
  assert.strictEqual(snap.tempo, 128);
  assert.strictEqual(snap.isPlaying, true);
  assert.strictEqual(snap.numTracks, 2);
  assert.strictEqual(snap.numClips, 3); // 2 + 1 filled slots
  assert.strictEqual(snap.numDevices, 3); // 2 + 1
  assert.strictEqual(snap.numScenes, 4);
});
check("trait map has all four AdamKadmon keys, normalised", () => {
  const tm = deriveTraitMap(snap);
  ["spectral_profile", "temporal_topology", "modulation_graph", "performance_response"]
    .forEach((k) => assert.ok(tm[k], `missing ${k}`));
  Object.values(tm.spectral_profile).forEach((v) =>
    assert.ok(v >= 0 && v <= 1, "spectral value out of range"));
});
check("coherence in [0,1], entropy in [0,10]", () => {
  const c = deriveCoherence(snap);
  const e = deriveEntropy(snap);
  assert.ok(c >= 0 && c <= 1, `coherence ${c}`);
  assert.ok(e >= 0 && e <= 10, `entropy ${e}`);
});
check("buildMessages emits transport, structure, tracks, organism", () => {
  const addrs = buildMessages(snap).map((m) => m.address);
  assert.ok(addrs.includes("/ableton/transport"));
  assert.ok(addrs.includes("/ableton/set/structure"));
  assert.ok(addrs.includes("/ableton/organism/update"));
  assert.strictEqual(addrs.filter((a) => a === "/ableton/track").length, 2);
});

console.log("End-to-end over UDP");
const PORT = 57219; // test port, not the live 57120
const received = [];
const server = dgram.createSocket("udp4");

server.on("message", (msg) => received.push(decode(msg)));
server.bind(PORT, "127.0.0.1", () => {
  const bridge = new BrahmaBridge({
    song: mockSong(),
    setName: "Smoke Set",
    settings: { oscHost: "127.0.0.1", oscPort: PORT, broadcastHz: 10 },
    logger: { info: () => {} },
  });
  bridge.subscribe();
  bridge.tick(); // one synchronous frame
  bridge.osc.send("/ableton/release", []);

  // Give the UDP datagrams a moment to land, then assert.
  setTimeout(() => {
    server.close();
    check("UDP listener received transport frame", () => {
      const t = received.find((m) => m.address === "/ableton/transport");
      assert.ok(t, "no /ableton/transport received");
      assert.strictEqual(t.args[0], 1); // playing
      assert.ok(Math.abs(t.args[1] - 128.0) < 1e-2); // tempo
    });
    check("UDP listener received organism update with id 1003 'Ableton'", () => {
      const o = received.find((m) => m.address === "/ableton/organism/update");
      assert.ok(o, "no organism update received");
      assert.strictEqual(o.args[0], 1003);
      assert.strictEqual(o.args[1], "Ableton");
    });
    check("two per-track messages received", () => {
      const tracks = received.filter((m) => m.address === "/ableton/track");
      assert.strictEqual(tracks.length, 2);
      assert.strictEqual(tracks[0].args[1], "Drums");
    });

    bridge.osc.close();
    console.log(failures === 0
      ? "\nAll smoke tests passed."
      : `\n${failures} test(s) FAILED.`);
    process.exit(failures === 0 ? 0 : 1);
  }, 150);
});
