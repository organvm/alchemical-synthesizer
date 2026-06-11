"use strict";
/**
 * licensing.js — Accounts, API keys, and license keys.
 *
 * Credentials are the product's gate. We support two intertwined concepts:
 *   - API keys  (`bk_live_…`) authenticate requests to API/MCP/ACP, are metered,
 *     and are bound to a plan.
 *   - License keys (`BRAHMA-XXXX-…`) authorize self-hosted/Foundry deployments.
 *
 * Passwords are hashed with scrypt (Node built-in crypto) — no plaintext, no
 * external auth dependency.
 */

const crypto = require("crypto");
const { collection, logEvent } = require("../core/store");
const { getPlan } = require("./plans");

const users = () => collection("users");
const keys = () => collection("apiKeys");

// ---- password hashing (scrypt) ----
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, passwordHash: hash };
}
function verifyPassword(password, salt, expected) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}

// ---- key generation ----
function genApiKey() {
  return "bk_live_" + crypto.randomBytes(24).toString("base64url");
}
function genLicenseKey() {
  const block = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `BRAHMA-${block()}-${block()}-${block()}-${block()}`;
}

// ---- accounts ----
function createUser({ email, password, plan = "free" }) {
  email = String(email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("valid email required");
  if (!password || password.length < 8) throw new Error("password must be at least 8 characters");
  if (users().find((u) => u.email === email)) throw new Error("account already exists");

  const { salt, passwordHash } = hashPassword(password);
  const user = {
    id: "usr_" + crypto.randomBytes(8).toString("hex"),
    email, salt, passwordHash,
    plan: getPlan(plan).id,
    createdAt: new Date().toISOString()
  };
  users().insert(user);
  const key = issueApiKey(email, user.plan, "default");
  logEvent("user.created", email);
  return { user: publicUser(user), apiKey: key.key };
}

function authenticate(email, password) {
  email = String(email || "").trim().toLowerCase();
  const user = users().find((u) => u.email === email);
  if (!user) return null;
  if (!verifyPassword(password, user.salt, user.passwordHash)) return null;
  return publicUser(user);
}

function publicUser(u) {
  return { id: u.id, email: u.email, plan: u.plan, createdAt: u.createdAt };
}

function setPlan(email, plan) {
  email = String(email || "").toLowerCase();
  const p = getPlan(plan).id;
  users().update((u) => u.email === email, { plan: p });
  // Cascade plan onto the owner's keys.
  for (const k of keys().filter((k) => k.ownerEmail === email)) {
    keys().update((x) => x.key === k.key, { plan: p });
  }
  logEvent("plan.changed", `${email}:${p}`);
  return p;
}

// ---- API keys ----
function issueApiKey(ownerEmail, plan = "free", label = "key") {
  const row = {
    key: genApiKey(),
    ownerEmail: String(ownerEmail || "").toLowerCase(),
    plan: getPlan(plan).id,
    label,
    status: "active",
    createdAt: new Date().toISOString(),
    usage: { count: 0, periodStart: monthKey() }
  };
  keys().insert(row);
  logEvent("apikey.issued", row.key.slice(0, 12) + "…");
  return row;
}

function resolveApiKey(key) {
  if (!key) return null;
  const row = keys().find((k) => k.key === key && k.status === "active");
  return row || null;
}

function revokeApiKey(key) {
  return keys().update((k) => k.key === key, { status: "revoked" });
}

function listKeysFor(email) {
  return keys()
    .filter((k) => k.ownerEmail === String(email).toLowerCase())
    .map((k) => ({ ...k, key: maskKey(k.key) }));
}

// ---- license keys (self-host / Foundry) ----
function issueLicense(ownerEmail) {
  const key = issueApiKey(ownerEmail, "foundry", "license");
  const license = genLicenseKey();
  keys().update((k) => k.key === key.key, { licenseKey: license });
  return { apiKey: key.key, licenseKey: license };
}

// ---- helpers ----
function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function maskKey(k) {
  return k.length > 14 ? k.slice(0, 12) + "…" + k.slice(-4) : k;
}

module.exports = {
  createUser, authenticate, setPlan, publicUser,
  issueApiKey, resolveApiKey, revokeApiKey, listKeysFor,
  issueLicense, monthKey, maskKey, genApiKey, genLicenseKey
};
