"use strict";
/**
 * rest.js — REST API (/api/v1).
 *
 * The HTTP face of the capability core plus account, billing, marketplace and
 * waitlist endpoints. Metered endpoints require an API key (Bearer/x-api-key).
 */

const express = require("express");
const actions = require("../core/actions");
const licensing = require("../auth/licensing");
const { meter } = require("../auth/metering");
const { getPlan, listPlans } = require("../auth/plans");
const billing = require("../billing/billing");
const marketplace = require("../marketplace/marketplace");
const { collection } = require("../core/store");

const router = express.Router();
router.use(express.json({ limit: "256kb" }));

const ok = (res, data) => res.json({ ok: true, data });
const fail = (res, code, msg, extra = {}) => res.status(code).json({ ok: false, error: msg, ...extra });

// ---- meta ----
router.get("/", (req, res) => ok(res, {
  service: "brahma-foundry", version: "0.1.0",
  surfaces: { rest: "/api/v1", mcp: "/mcp", acp_comm: "/acp", acp_client: "/acp/jsonrpc" },
  capabilities: actions.listActions().map((a) => a.name),
  docs: "/api/v1/openapi.json"
}));

router.get("/openapi.json", (req, res) => res.json(buildOpenApi()));

// ---- catalog (free, unmetered reads but allow anonymous) ----
router.get("/modules", meter({ cost: 0, require: false }), (req, res) =>
  ok(res, actions.invoke("list_modules", { category: req.query.category, q: req.query.q })));

router.get("/modules/:name", meter({ cost: 0, require: false }), (req, res) => {
  try { ok(res, actions.invoke("get_module", { name: req.params.name })); }
  catch (e) { fail(res, 404, e.message); }
});

router.get("/organism/state", meter({ cost: 0, require: false }), (req, res) =>
  ok(res, actions.invoke("get_organism_state")));

// ---- render (metered, billable) ----
router.post("/render", meter({ cost: 1 }), (req, res) => {
  try {
    const spc = actions.invoke("render_specimen", {
      module: req.body.module, title: req.body.title,
      creator: req.body.creator || req.auth.ownerEmail, durationSec: req.body.durationSec
    });
    ok(res, { specimen: spc, usage: req.auth.usage, quota: req.auth.quota });
  } catch (e) { fail(res, 400, e.message); }
});

// ---- specimens / marketplace ----
router.get("/specimens", (req, res) => ok(res, marketplace.listForSale({ module: req.query.module, creator: req.query.creator })));

router.get("/specimens/:id", (req, res) => {
  const s = marketplace.getSpecimen(req.params.id);
  return s ? ok(res, s) : fail(res, 404, "specimen_not_found");
});

router.get("/specimens/:id/audio", (req, res) => {
  const s = marketplace.getSpecimen(req.params.id);
  if (!s) return fail(res, 404, "specimen_not_found");
  if (s.simulated || !s.audioUrl) {
    return fail(res, 409, "specimen_simulated", { hint: "Audio is produced by a live SuperCollider engine; this specimen was rendered in simulation mode." });
  }
  // In a live deployment the SC NRT renderer writes a WAV that is streamed here.
  return fail(res, 501, "audio_streaming_not_implemented", { note: "Wire SC NRT output path here (see product/README.md)." });
});

router.post("/specimens/:id/list", meter({ cost: 0 }), (req, res) => {
  try {
    const s = marketplace.listSpecimen({
      specimenId: req.params.id, ownerEmail: req.auth.ownerEmail,
      ownerPlan: req.auth.plan, priceCents: req.body.priceCents
    });
    ok(res, s);
  } catch (e) { fail(res, e.code === "plan_forbidden" ? 403 : 400, e.message); }
});

router.post("/specimens/:id/unlist", meter({ cost: 0 }), (req, res) =>
  ok(res, marketplace.unlist(req.params.id)));

// ---- accounts ----
router.post("/account/signup", (req, res) => {
  try { ok(res, licensing.createUser({ email: req.body.email, password: req.body.password })); }
  catch (e) { fail(res, 400, e.message); }
});

router.post("/account/login", (req, res) => {
  const user = licensing.authenticate(req.body.email, req.body.password);
  if (!user) return fail(res, 401, "invalid_credentials");
  ok(res, { user, keys: licensing.listKeysFor(user.email) });
});

router.get("/account/keys", meter({ cost: 0 }), (req, res) =>
  ok(res, licensing.listKeysFor(req.auth.ownerEmail)));

router.post("/account/keys", meter({ cost: 0 }), (req, res) =>
  ok(res, { ...licensing.issueApiKey(req.auth.ownerEmail, req.auth.plan, req.body.label || "key") }));

router.post("/account/keys/revoke", meter({ cost: 0 }), (req, res) => {
  licensing.revokeApiKey(req.body.key);
  ok(res, { revoked: true });
});

router.get("/account/usage", meter({ cost: 0 }), (req, res) =>
  ok(res, { plan: req.auth.plan, usage: req.auth.usage, quota: req.auth.quota }));

// ---- plans & billing ----
router.get("/plans", (req, res) => ok(res, listPlans()));
router.get("/billing/status", (req, res) => ok(res, billing.status()));

router.post("/billing/checkout/plan", async (req, res) => {
  try { ok(res, await billing.checkoutPlan({ email: req.body.email, plan: req.body.plan, req })); }
  catch (e) { fail(res, 400, e.message); }
});

router.post("/billing/checkout/specimen", async (req, res) => {
  try { ok(res, await billing.checkoutSpecimen({ email: req.body.email, specimenId: req.body.specimenId, req })); }
  catch (e) { fail(res, 400, e.message); }
});

// Stub confirm (used when Stripe is not configured) — simulates a paid webhook.
router.get("/billing/confirm", (req, res) => {
  const order = billing.getOrder(req.query.order);
  if (!order) return fail(res, 404, "order_not_found");
  if (order.confirmToken !== req.query.token) return fail(res, 403, "bad_token");
  const result = billing.fulfil(order.id);
  res.send(`<!doctype html><meta charset=utf8><title>Order confirmed</title>
    <body style="font-family:system-ui;background:#120a1e;color:#d4d4d8;text-align:center;padding:4rem">
    <h1 style="color:#e94560">Payment confirmed (stub)</h1>
    <p>Order <code>${order.id}</code> — ${order.kind} — fulfilled.</p>
    <p><a style="color:#d4a853" href="/dashboard">Return to dashboard →</a></p>
    <p style="opacity:.5;font-size:.8rem">Set STRIPE_SECRET_KEY to replace this stub with real Stripe Checkout.</p></body>`);
});

// Stripe webhook (raw body handled in server.js before json parser).
router.post("/billing/webhook", (req, res) => {
  // server.js mounts a raw handler; this is a fallback for the stub mode.
  try {
    const evt = req.body || {};
    if (evt.type === "checkout.session.completed" && evt.data?.object?.metadata?.orderId) {
      billing.fulfil(evt.data.object.metadata.orderId);
    }
    res.json({ received: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---- waitlist (top-of-funnel) ----
router.post("/waitlist", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email.includes("@")) return fail(res, 400, "valid email required");
  const wl = collection("waitlist");
  if (!wl.find((w) => w.email === email)) {
    wl.insert({ email, interest: req.body.interest || "", createdAt: new Date().toISOString() });
  }
  ok(res, { joined: true });
});

// ---- minimal OpenAPI generator ----
function buildOpenApi() {
  return {
    openapi: "3.0.0",
    info: { title: "Brahma Foundry API", version: "0.1.0", description: "Productization API for the Alchemical Synthesizer." },
    servers: [{ url: "/api/v1" }],
    paths: {
      "/modules": { get: { summary: "List modules" } },
      "/modules/{name}": { get: { summary: "Get module" } },
      "/organism/state": { get: { summary: "Live organism telemetry" } },
      "/render": { post: { summary: "Render a specimen (metered)", security: [{ apiKey: [] }] } },
      "/specimens": { get: { summary: "List marketplace specimens" } },
      "/plans": { get: { summary: "List plans" } },
      "/billing/checkout/plan": { post: { summary: "Start a plan checkout" } },
      "/account/signup": { post: { summary: "Create an account" } },
      "/waitlist": { post: { summary: "Join the waitlist" } }
    },
    components: { securitySchemes: { apiKey: { type: "http", scheme: "bearer" } } }
  };
}

module.exports = router;
