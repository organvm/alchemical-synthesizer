"use strict";
/**
 * billing.js — Checkout & orders. Stripe-optional.
 *
 * Logical-order monetization: this ships a working checkout *today*. If
 * STRIPE_SECRET_KEY is set, real Stripe Checkout Sessions are created. If not,
 * a deterministic stub session is returned and can be completed via the dev
 * confirm endpoint — so the revenue surface is exercisable end-to-end before
 * Stripe is wired, then becomes real by adding one env var.
 */

const crypto = require("crypto");
const { collection, logEvent } = require("../core/store");
const { getPlan, PLANS } = require("../auth/plans");
const { setPlan } = require("../auth/licensing");
const { payoutSplit, getSpecimen } = require("../marketplace/marketplace");

const orders = () => collection("orders");

let stripe = null;
let stripeReady = false;
(function initStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return;
  try {
    stripe = require("stripe")(key);
    stripeReady = true;
    console.log("[billing] Stripe enabled");
  } catch (e) {
    console.warn("[billing] STRIPE_SECRET_KEY set but 'stripe' package missing — using stub checkout");
  }
})();

function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${proto}://${req.headers.host}`;
}

/** Create a checkout for a plan upgrade. */
async function checkoutPlan({ email, plan, req }) {
  const target = getPlan(plan);
  if (!target || target.id === "free") throw new Error("choose a paid plan");
  if (target.contactSales) return { contactSales: true, plan: target.id };

  const order = baseOrder({ email, kind: "plan", amountCents: target.priceCents, meta: { plan: target.id } });

  if (stripeReady) {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price_data: {
        currency: "usd",
        recurring: { interval: "month" },
        product_data: { name: `Brahma — ${target.name}` },
        unit_amount: target.priceCents
      }, quantity: 1 }],
      success_url: `${baseUrl(req)}/dashboard?checkout=success&order=${order.id}`,
      cancel_url: `${baseUrl(req)}/pricing?checkout=cancel`,
      metadata: { orderId: order.id, plan: target.id, email }
    });
    orders().update((o) => o.id === order.id, { provider: "stripe", sessionId: session.id });
    return { checkoutUrl: session.url, orderId: order.id, provider: "stripe" };
  }

  // Stub: a local confirm URL that simulates a completed payment.
  const confirmUrl = `${baseUrl(req)}/api/v1/billing/confirm?order=${order.id}&token=${order.confirmToken}`;
  return { checkoutUrl: confirmUrl, orderId: order.id, provider: "stub", stub: true };
}

/** Create a checkout to buy a marketplace specimen. */
async function checkoutSpecimen({ email, specimenId, req }) {
  const spc = getSpecimen(specimenId);
  if (!spc || !spc.forSale) throw new Error("specimen not for sale");
  const split = payoutSplit(spc.priceCents);
  const order = baseOrder({
    email, kind: "specimen", amountCents: spc.priceCents,
    meta: { specimenId, creator: spc.creator, ...split }
  });

  if (stripeReady) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{ price_data: {
        currency: "usd",
        product_data: { name: spc.title },
        unit_amount: spc.priceCents
      }, quantity: 1 }],
      success_url: `${baseUrl(req)}/dashboard?checkout=success&order=${order.id}`,
      cancel_url: `${baseUrl(req)}/marketplace?checkout=cancel`,
      metadata: { orderId: order.id, specimenId, email }
    });
    orders().update((o) => o.id === order.id, { provider: "stripe", sessionId: session.id });
    return { checkoutUrl: session.url, orderId: order.id, provider: "stripe" };
  }

  const confirmUrl = `${baseUrl(req)}/api/v1/billing/confirm?order=${order.id}&token=${order.confirmToken}`;
  return { checkoutUrl: confirmUrl, orderId: order.id, provider: "stub", stub: true };
}

function baseOrder({ email, kind, amountCents, meta }) {
  const order = {
    id: "ord_" + crypto.randomBytes(8).toString("hex"),
    email: String(email || "").toLowerCase(),
    kind, amountCents, meta,
    status: "pending",
    provider: "stub",
    confirmToken: crypto.randomBytes(8).toString("hex"),
    createdAt: new Date().toISOString()
  };
  orders().insert(order);
  return order;
}

/** Fulfil an order (called by stub confirm or Stripe webhook). */
function fulfil(orderId) {
  const order = orders().find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "order_not_found" };
  if (order.status === "paid") return { ok: true, order, already: true };

  orders().update((o) => o.id === orderId, { status: "paid", paidAt: new Date().toISOString() });
  if (order.kind === "plan" && order.meta && order.meta.plan) {
    setPlan(order.email, order.meta.plan);
  }
  logEvent("order.fulfilled", `${orderId}:${order.kind}`);
  return { ok: true, order: orders().find((o) => o.id === orderId) };
}

function getOrder(id) { return orders().find((o) => o.id === id) || null; }
function listOrders(email) { return orders().filter((o) => o.email === String(email).toLowerCase()); }
function status() { return { stripe: stripeReady, plans: Object.keys(PLANS) }; }

module.exports = { checkoutPlan, checkoutSpecimen, fulfil, getOrder, listOrders, status, stripeReady: () => stripeReady };
