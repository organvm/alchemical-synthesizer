"use strict";

/*
 * Brahma Bridge — Ableton Live Extension entry point.
 *
 * Absorbs the active Live Set (transport, tracks, clips, devices) and
 * re-expresses it inside the Brahma Meta-Rack by streaming OSC to
 * SuperCollider (default 127.0.0.1:57120). Live becomes a donor identity
 * the organism wears.
 *
 * Lifecycle hooks (`activate`/`deactivate`) follow the Extensions SDK host
 * contract; `context` carries the Live Set (`context.song`), per-extension
 * `settings`, a `logger`, and a `transport`/`song` change subscription API.
 * Because the beta API is still moving, the only hard dependency on the host
 * is `context.song` (read via src/live-adapter.js); everything else is
 * optional and feature-detected.
 */

const { OscSender } = require("./osc");
const { snapshotSet } = require("./live-adapter");
const { buildMessages } = require("./mapper");

const DEFAULTS = {
  oscHost: "127.0.0.1",
  oscPort: 57120,
  broadcastHz: 10,
  syncTransport: true,
};

class BrahmaBridge {
  constructor(context = {}) {
    this.context = context;
    this.settings = Object.assign({}, DEFAULTS, context.settings || {});
    this.log = (msg) => {
      const logger = context.logger || console;
      (logger.info || logger.log).call(logger, `[brahma-bridge] ${msg}`);
    };
    this.osc = new OscSender({
      host: this.settings.oscHost,
      port: this.settings.oscPort,
      log: this.log,
    });
    this.timer = null;
    this.changes = 0; // edits observed since the last broadcast
    this.lastSnapshotJson = "";
  }

  /** Read the Set and push one frame of OSC to Brahma. */
  tick() {
    const song = this.context.song;
    if (!song) return;
    const snap = snapshotSet(song, this.changes);
    this.changes = 0;

    for (const { address, args } of buildMessages(snap)) {
      if (!this.settings.syncTransport && address === "/ableton/transport") continue;
      this.osc.send(address, args);
    }

    // Track edit churn for the entropy heuristic without spamming logs.
    const json = JSON.stringify(snap.tracks);
    if (json !== this.lastSnapshotJson) {
      this.lastSnapshotJson = json;
    }
  }

  /** Subscribe to Live change notifications when the host offers them. */
  subscribe() {
    const song = this.context.song;
    if (!song) return;
    const onChange = () => {
      this.changes += 1;
    };
    // Common SDK shapes: song.addListener(prop, cb) or song.on(event, cb).
    if (typeof song.on === "function") {
      ["tracks", "tempo", "isPlaying", "clips"].forEach((evt) => {
        try {
          song.on(evt, onChange);
        } catch (_) {
          /* event not supported */
        }
      });
    } else if (typeof song.addListener === "function") {
      ["tracks", "tempo", "is_playing"].forEach((prop) => {
        try {
          song.addListener(prop, onChange);
        } catch (_) {
          /* property not observable */
        }
      });
    }
  }

  /** Host calls this when the extension is enabled. */
  activate() {
    this.subscribe();
    this.osc.send("/ableton/absorb", [String(this.context.setName || "Live Set")]);

    const hz = Math.max(1, Math.min(30, Number(this.settings.broadcastHz) || 10));
    const intervalMs = Math.round(1000 / hz);
    this.timer = setInterval(() => this.tick(), intervalMs);
    if (this.timer.unref) this.timer.unref();

    this.log(
      `activated → OSC ${this.settings.oscHost}:${this.settings.oscPort} @ ${hz}Hz`
    );
  }

  /** Host calls this when the extension is disabled / Live closes. */
  deactivate() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.osc.send("/ableton/release", []);
    this.osc.close();
    this.log("deactivated");
  }
}

// The Extensions SDK host imports this module and calls activate/deactivate
// with a context. We expose a factory plus the bare hooks for either shape.
let _instance = null;

function activate(context) {
  _instance = new BrahmaBridge(context);
  _instance.activate();
  return _instance;
}

function deactivate() {
  if (_instance) {
    _instance.deactivate();
    _instance = null;
  }
}

module.exports = { BrahmaBridge, activate, deactivate };
