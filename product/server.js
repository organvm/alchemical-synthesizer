"use strict";
/**
 * Brahma Foundry — productization server.
 *
 * One coherent Node service exposing every surface the directive asked for:
 *   - Dashboard UI            /dashboard
 *   - Pricing + waitlist      /pricing , /marketplace
 *   - REST API                /api/v1
 *   - MCP server              /mcp
 *   - ACP (both)              /acp (comm) , /acp/jsonrpc (client)
 *   - Live telemetry          WebSocket (organism state)
 *
 * Runs with or without a live SuperCollider engine (simulation fallback), so it
 * is deployable today. Stripe is optional (stub checkout until configured).
 */

const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const engine = require("./src/core/engine");
const restRouter = require("./src/api/rest");
const mcpRouter = require("./src/api/mcp");
const acpRouter = require("./src/api/acp");
const billing = require("./src/billing/billing");

const PORT = Number(process.env.PORT || 4000);
const app = express();

// --- Stripe webhook needs the raw body; mount BEFORE any json parser. ---
app.post("/api/v1/billing/webhook/stripe", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const evt = JSON.parse(req.body.toString("utf8"));
    if (evt.type === "checkout.session.completed") {
      const orderId = evt.data?.object?.metadata?.orderId;
      if (orderId) billing.fulfil(orderId);
    }
    res.json({ received: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// CORS — open for agent surfaces (API/MCP/ACP are key-gated, not origin-gated).
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// --- Surfaces ---
app.use("/api/v1", restRouter);
app.use("/mcp", mcpRouter);
app.use("/acp", acpRouter);

// --- Static front end ---
app.use("/dashboard", express.static(path.join(__dirname, "public", "dashboard")));
app.use("/pricing", express.static(path.join(__dirname, "public", "pricing")));
app.use("/marketplace", express.static(path.join(__dirname, "public", "dashboard"))); // marketplace tab lives in dashboard SPA
app.use(express.static(path.join(__dirname, "public")));

// Root → landing
app.get("/", (req, res) => res.redirect("/pricing"));

// Health
app.get("/healthz", (req, res) => res.json({ ok: true, engine: engine.isOnline() ? "online" : "simulation", uptime: process.uptime() }));

// --- HTTP + WebSocket ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello", service: "brahma-foundry" }));
});

// Push organism telemetry to dashboard clients at 5Hz.
setInterval(() => {
  if (!wss.clients.size) return;
  const payload = JSON.stringify({ type: "telemetry", online: engine.isOnline(), organisms: engine.organismState() });
  for (const c of wss.clients) if (c.readyState === WebSocket.OPEN) c.send(payload);
}, 200);

engine.start();

server.listen(PORT, () => {
  console.log(`\n=== BRAHMA FOUNDRY ONLINE ===`);
  console.log(`  Pricing / landing : http://localhost:${PORT}/pricing`);
  console.log(`  Dashboard         : http://localhost:${PORT}/dashboard`);
  console.log(`  REST API          : http://localhost:${PORT}/api/v1`);
  console.log(`  MCP server        : http://localhost:${PORT}/mcp`);
  console.log(`  ACP (comm/client) : http://localhost:${PORT}/acp`);
  console.log(`  Engine            : ${engine.isOnline() ? "live" : "simulation (no SC detected yet)"}`);
  console.log(`  Billing           : ${billing.stripeReady() ? "Stripe" : "stub checkout"}\n`);
});

module.exports = { app, server };
