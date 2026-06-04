"use strict";

/*
 * Minimal, zero-dependency OSC 1.0 message encoder + UDP sender.
 *
 * The Brahma Meta-Rack speaks OSC on three UDP ports (see CLAUDE.md):
 *   57120  SuperCollider receive  <- we send here
 *   57121  Pure Data receive
 *   57122  Node.js Visual Cortex receive
 *
 * We only need to *send* messages from the Extension, and only three
 * argument types (int32 "i", float32 "f", string "s"), so this avoids
 * pulling the `osc` npm package into the Live extension sandbox.
 */

const dgram = require("dgram");

function pad4(len) {
  // OSC pads every chunk to a 4-byte boundary.
  return (4 - (len % 4)) % 4;
}

function encodeString(str) {
  const raw = Buffer.from(String(str), "ascii");
  // At least one trailing null, then pad to 4 bytes.
  const total = raw.length + 1 + pad4(raw.length + 1);
  const buf = Buffer.alloc(total);
  raw.copy(buf, 0);
  return buf;
}

/**
 * Encode a single OSC message into a Buffer.
 * @param {string} address  OSC address pattern, e.g. "/ableton/transport"
 * @param {Array<number|string>} args  arguments; numbers map to i/f, strings to s
 */
function encodeMessage(address, args = []) {
  const parts = [encodeString(address)];

  let typeTags = ",";
  const argBufs = [];

  for (const arg of args) {
    if (typeof arg === "string") {
      typeTags += "s";
      argBufs.push(encodeString(arg));
    } else if (typeof arg === "number" && Number.isInteger(arg)) {
      typeTags += "i";
      const b = Buffer.alloc(4);
      b.writeInt32BE(arg | 0, 0);
      argBufs.push(b);
    } else if (typeof arg === "number") {
      typeTags += "f";
      const b = Buffer.alloc(4);
      b.writeFloatBE(arg, 0);
      argBufs.push(b);
    } else if (typeof arg === "boolean") {
      // Encode as int32 0/1 — SuperCollider treats these as numbers.
      typeTags += "i";
      const b = Buffer.alloc(4);
      b.writeInt32BE(arg ? 1 : 0, 0);
      argBufs.push(b);
    } else {
      throw new TypeError(`Unsupported OSC arg type: ${typeof arg}`);
    }
  }

  parts.push(encodeString(typeTags));
  parts.push(...argBufs);
  return Buffer.concat(parts);
}

class OscSender {
  /**
   * @param {object} opts
   * @param {string} [opts.host="127.0.0.1"]
   * @param {number} [opts.port=57120]
   * @param {(msg:string)=>void} [opts.log]
   */
  constructor({ host = "127.0.0.1", port = 57120, log = () => {} } = {}) {
    this.host = host;
    this.port = port;
    this.log = log;
    this.socket = dgram.createSocket("udp4");
    this.sent = 0;
    this.socket.on("error", (err) => this.log(`OSC socket error: ${err.message}`));
  }

  /**
   * Send one OSC message. Errors are swallowed (best-effort, like the PD/web
   * bridges) so a missing SuperCollider never crashes the extension.
   */
  send(address, args = []) {
    let buf;
    try {
      buf = encodeMessage(address, args);
    } catch (e) {
      this.log(`OSC encode failed for ${address}: ${e.message}`);
      return;
    }
    this.socket.send(buf, this.port, this.host, (err) => {
      if (err) this.log(`OSC send failed for ${address}: ${err.message}`);
    });
    this.sent += 1;
  }

  close() {
    try {
      this.socket.close();
    } catch (_) {
      /* already closed */
    }
  }
}

module.exports = { OscSender, encodeMessage, encodeString };
