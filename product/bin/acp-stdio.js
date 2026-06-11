#!/usr/bin/env node
"use strict";
/**
 * acp-stdio.js — Agent Client Protocol over stdio (the native ACP transport).
 *
 * Native ACP clients (e.g. Zed) speak newline-delimited JSON-RPC over stdio.
 * This adapter reuses the exact same request handler as the HTTP endpoint
 * (acp.acpRpc), so behaviour is identical across transports.
 *
 *   node bin/acp-stdio.js
 *   # then write JSON-RPC requests, one per line, to stdin.
 */

const acp = require("../src/api/acp");

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); }
    catch (e) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }) + "\n");
      continue;
    }
    // Fake req with headers so extractKey() can read an env-provided key.
    const fakeReq = { headers: process.env.BRAHMA_API_KEY ? { authorization: `Bearer ${process.env.BRAHMA_API_KEY}` } : {}, query: {} };
    const resp = acp.acpRpc(msg, fakeReq);
    process.stdout.write(JSON.stringify(resp) + "\n");
  }
});

process.stderr.write("[acp-stdio] ready — Agent Client Protocol over stdio. Send JSON-RPC lines.\n");
