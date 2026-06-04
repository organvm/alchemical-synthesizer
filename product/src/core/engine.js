"use strict";
/**
 * engine.js — Bridge to the SuperCollider Brahma engine over OSC.
 *
 * The Foundry must run whether or not a live SC server is present (so it is
 * deployable to the cloud today, with the audio engine local to performers).
 * - When SC is reachable, organism telemetry flows in on 57122 and commands go
 *   out on 57120, exactly matching the existing brahma/web bridge topology.
 * - When SC is absent, render_specimen produces a *simulated* specimen record
 *   (clearly flagged) so the product, API, MCP and ACP all stay functional.
 */

const crypto = require("crypto");
const { collection, logEvent } = require("./store");
const { upsertFromRegistry, getModule, seedTraitMap } = require("./catalog");

const OSC_RECV_PORT = Number(process.env.OSC_RECV_PORT || 57122);
const OSC_SEND_PORT = Number(process.env.OSC_SEND_PORT || 57120);
const SC_HOST = process.env.SC_HOST || "127.0.0.1";

const specimens = () => collection("specimens");

// Live organism telemetry keyed by entityId.
const organisms = new Map();
let online = false;
let udpPort = null;
let sendPort = null;

function start() {
  let osc;
  try { osc = require("osc"); } catch (e) {
    console.warn("[engine] 'osc' not installed — engine bridge disabled, simulation only");
    return;
  }
  try {
    udpPort = new osc.UDPPort({ localAddress: "0.0.0.0", localPort: OSC_RECV_PORT, metadata: true });
    sendPort = new osc.UDPPort({ localAddress: "0.0.0.0", localPort: 0, remoteAddress: SC_HOST, remotePort: OSC_SEND_PORT, metadata: true });

    udpPort.on("ready", () => { online = true; console.log(`[engine] OSC listener ready :${OSC_RECV_PORT}`); });
    udpPort.on("error", (e) => console.warn("[engine] OSC error:", e.message));
    udpPort.on("message", onOscMessage);
    sendPort.on("ready", () => console.log(`[engine] OSC sender → ${SC_HOST}:${OSC_SEND_PORT}`));
    sendPort.on("error", () => {});

    udpPort.open();
    sendPort.open();
  } catch (e) {
    console.warn("[engine] failed to bind OSC ports (likely already in use):", e.message);
  }
}

function onOscMessage(msg) {
  const a = msg.args || [];
  const val = (i) => (a[i] && a[i].value !== undefined ? a[i].value : a[i]);

  if (msg.address === "/brahma/organism/update") {
    const id = val(0);
    organisms.set(id, {
      id, type: val(1), coherence: val(2), entropy: val(3), lastUpdate: Date.now()
    });
  } else if (msg.address === "/brahma/registry/module") {
    upsertFromRegistry({
      name: val(0), category: val(1), synthDef: val(2),
      numParams: val(3) || 0, numInstances: val(4) || 0, description: val(5) || ""
    });
  }
}

/** Send a command to SC if connected. Returns whether it was dispatched live. */
function send(address, args = []) {
  if (!sendPort || !online) return false;
  try {
    sendPort.send({
      address,
      args: args.map((v) =>
        typeof v === "number"
          ? (Number.isInteger(v) ? { type: "i", value: v } : { type: "f", value: v })
          : { type: "s", value: String(v) })
    });
    return true;
  } catch (e) { return false; }
}

/** Decay stale organisms (mirrors the 2s web decay rule). */
function organismState() {
  const now = Date.now();
  for (const [id, o] of organisms) if (now - o.lastUpdate > 2000) organisms.delete(id);
  return [...organisms.values()];
}

/**
 * Render a specimen. Dispatches an NRT-style command to SC when live; always
 * records a reproducible specimen row. Audio is produced by the SC engine — in
 * cloud/offline mode the specimen is flagged `simulated:true`.
 */
function renderSpecimen({ module, title, creator, durationSec = 4 }) {
  const mod = getModule(module);
  if (!mod) throw new Error(`unknown module: ${module}`);

  const id = "spc_" + crypto.randomBytes(8).toString("hex");
  const live = send("/brahma/foundry/render", [id, module, Number(durationSec)]);
  const traitMap = seedTraitMap(module);

  const specimen = {
    id,
    title: title || `${module} specimen`,
    creator: creator || "anonymous",
    sourceModule: module,
    traitMap,
    durationSec: Number(durationSec),
    audioUrl: live ? `/api/v1/specimens/${id}/audio` : null,
    simulated: !live,
    forSale: false,
    priceCents: 0,
    createdAt: new Date().toISOString()
  };
  specimens().insert(specimen);
  logEvent("specimen.rendered", `${id}:${module}:${live ? "live" : "sim"}`);
  return specimen;
}

function isOnline() { return online; }

module.exports = { start, send, organismState, renderSpecimen, isOnline };
