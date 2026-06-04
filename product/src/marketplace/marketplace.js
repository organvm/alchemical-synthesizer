"use strict";
/**
 * marketplace.js — Specimen marketplace.
 *
 * Specimens (rendered audio artifacts, the NRT output of the engine) can be
 * listed for sale by creators on paid plans. Buyers purchase via the billing
 * layer; creators receive an 85% payout (tracked, paid out by the billing
 * provider in production).
 */

const { collection, logEvent } = require("../core/store");
const { getPlan } = require("../auth/plans");

const specimens = () => collection("specimens");
const PAYOUT_RATE = 0.85;

function listForSale(filter = {}) {
  let out = specimens().filter((s) => s.forSale);
  if (filter.creator) out = out.filter((s) => s.creator === filter.creator);
  if (filter.module) out = out.filter((s) => s.sourceModule === filter.module);
  return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

function getSpecimen(id) {
  return specimens().find((s) => s.id === id) || null;
}

/** List a specimen for sale — requires a plan that `canSell`. */
function listSpecimen({ specimenId, ownerEmail, ownerPlan, priceCents }) {
  const plan = getPlan(ownerPlan);
  if (!plan.canSell) {
    const err = new Error("your plan cannot sell specimens — upgrade to Alchemist");
    err.code = "plan_forbidden";
    throw err;
  }
  const spc = getSpecimen(specimenId);
  if (!spc) throw new Error("specimen not found");
  priceCents = Math.max(0, Math.round(Number(priceCents) || 0));
  specimens().update((s) => s.id === specimenId, {
    forSale: true, priceCents, creator: ownerEmail || spc.creator, listedAt: new Date().toISOString()
  });
  logEvent("specimen.listed", `${specimenId}:${priceCents}`);
  return getSpecimen(specimenId);
}

function unlist(specimenId) {
  specimens().update((s) => s.id === specimenId, { forSale: false });
  return getSpecimen(specimenId);
}

/** Compute a payout split for a sale. */
function payoutSplit(priceCents) {
  const creator = Math.round(priceCents * PAYOUT_RATE);
  return { creatorCents: creator, platformCents: priceCents - creator, rate: PAYOUT_RATE };
}

module.exports = { listForSale, getSpecimen, listSpecimen, unlist, payoutSplit, PAYOUT_RATE };
