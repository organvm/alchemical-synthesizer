"use strict";
/**
 * plans.js — Monetization tiers, defined in logical order.
 *
 * The product is built so revenue layers stack the way the directive asked:
 *   free        → acquisition (waitlist converts here)
 *   creator     → first paid tier; unlocks selling specimens
 *   pro         → full agent surfaces (API/MCP/ACP) at scale
 *   foundry     → enterprise / self-host license
 *
 * `monthlyQuota` is the metered render+API budget enforced in metering.js.
 */

const PLANS = {
  free: {
    id: "free",
    name: "Initiate",
    priceCents: 0,
    monthlyQuota: 50,
    features: ["Browse marketplace", "Dashboard access", "50 renders/mo", "REST API (rate-limited)"],
    canSell: false,
    agentSurfaces: false
  },
  creator: {
    id: "creator",
    name: "Alchemist",
    priceCents: 900,
    monthlyQuota: 1000,
    features: ["Everything in Initiate", "Sell specimens (85% payout)", "1,000 renders/mo", "MCP + ACP access"],
    canSell: true,
    agentSurfaces: true
  },
  pro: {
    id: "pro",
    name: "Transmuter",
    priceCents: 4900,
    monthlyQuota: 25000,
    features: ["Everything in Alchemist", "25,000 renders/mo", "Priority engine queue", "Higher API rate limits"],
    canSell: true,
    agentSurfaces: true
  },
  foundry: {
    id: "foundry",
    name: "Foundry (self-host)",
    priceCents: 0, // contact sales / license-key issued
    monthlyQuota: Infinity,
    features: ["Self-hosted license", "Unlimited renders", "All agent surfaces", "White-label dashboard"],
    canSell: true,
    agentSurfaces: true,
    contactSales: true
  }
};

function getPlan(id) {
  return PLANS[id] || PLANS.free;
}

function listPlans() {
  return Object.values(PLANS).map((p) => ({
    ...p,
    monthlyQuota: p.monthlyQuota === Infinity ? "unlimited" : p.monthlyQuota
  }));
}

module.exports = { PLANS, getPlan, listPlans };
