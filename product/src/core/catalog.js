"use strict";
/**
 * catalog.js — The module & specimen catalog.
 *
 * Seeds a representative slice of the ~317-SynthDef Brahma system so the product
 * has a real catalog the moment it boots, even before a live SuperCollider
 * engine has broadcast its registry. When the engine is online, live registry
 * broadcasts (see engine.js) augment/override these entries.
 */

const SEED_MODULES = [
  // ---- Synthesis Engines (engine.js category) ----
  { name: "PrimaMateria", category: "engine", synthDef: "\\primaMateria", description: "Subtractive — hard sync, ring mod, unison", tags: ["subtractive", "analog"] },
  { name: "Azoth", category: "engine", synthDef: "\\azoth", description: "4-operator FM, 8 algorithms, DX7-class", tags: ["fm", "digital"] },
  { name: "Quintessence", category: "engine", synthDef: "\\quintessence", description: "Additive (32 harmonics) with spectral morph", tags: ["additive", "spectral"] },
  { name: "Ouroboros", category: "engine", synthDef: "\\ouroboros", description: "Wavetable, dual-table morph with position FM", tags: ["wavetable"] },
  { name: "Chrysopoeia", category: "engine", synthDef: "\\chrysopoeia", description: "Phase distortion, CZ-style, DCW envelope", tags: ["phase-distortion"] },
  { name: "Homunculus", category: "engine", synthDef: "\\homunculus", description: "Physical modeling — pluck, bow, blow, modal", tags: ["physical-modeling"] },
  { name: "Buchlaeus", category: "engine", synthDef: "\\buchlaeus", description: "West Coast — complex osc, TZFM, wavefolding", tags: ["west-coast"] },
  { name: "Logos", category: "engine", synthDef: "\\logos", description: "Formant — 5-formant vowel synthesis, choir", tags: ["formant", "vocal"] },
  { name: "Tetramorph", category: "engine", synthDef: "\\tetramorph", description: "Vector — 4-corner XY crossfade", tags: ["vector"] },
  { name: "Nebula", category: "engine", synthDef: "\\nebula", description: "Granular cloud synthesis with freeze/spray", tags: ["granular"] },
  // ---- Organisms ----
  { name: "Proteus", category: "organism", synthDef: "\\proteus", description: "The Form-Knower — high-fidelity emulation", tags: ["absorption", "emulation"] },
  { name: "Relinquished", category: "organism", synthDef: "\\relinquished", description: "The Parasite — single-source binding + reflection", tags: ["absorption", "parasite"] },
  { name: "Typhon", category: "organism", synthDef: "\\typhon", description: "The Accumulator — lossless stacking growth", tags: ["absorption", "fsap"] },
  { name: "AgentSmith", category: "organism", synthDef: "\\agentSmith", description: "The Enforcer — self-replicating homogeneity", tags: ["absorption"] },
  { name: "Ditto", category: "organism", synthDef: "\\ditto", description: "The Mimic — identity duplication", tags: ["absorption", "mimic"] },
  { name: "Golem", category: "organism", synthDef: "\\golem", description: "Percussion organism — full drum machine", tags: ["percussion"] }
];

// Trait-map archetypes used when a specimen is rendered without a live AE stage.
function seedTraitMap(moduleName) {
  // Deterministic pseudo-traits derived from the module name so specimens are
  // reproducible. Honest seam: real spectral traits require the SC AE stage
  // (see /pragma) — these are structurally-valid placeholders.
  let h = 0;
  for (const c of moduleName) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const f = (n) => Number((((h >> n) & 0xff) / 255).toFixed(3));
  return {
    spectral_profile: [f(0), f(4), f(8), f(12)],
    temporal_topology: [f(2), f(6)],
    modulation_graph: [f(10), f(14)],
    performance_response: [f(16), f(20)]
  };
}

const modules = new Map(SEED_MODULES.map((m) => [m.name, { numParams: 8, numInstances: 0, ...m }]));

function listModules(filter = {}) {
  let out = [...modules.values()];
  if (filter.category) out = out.filter((m) => m.category === filter.category);
  if (filter.q) {
    const q = String(filter.q).toLowerCase();
    out = out.filter((m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  }
  return out;
}

function getModule(name) {
  return modules.get(name) || null;
}

/** Merge a live registry broadcast from SuperCollider into the catalog. */
function upsertFromRegistry(row) {
  if (!row || !row.name) return;
  const existing = modules.get(row.name) || {};
  modules.set(row.name, { ...existing, ...row, live: true });
}

module.exports = { listModules, getModule, upsertFromRegistry, seedTraitMap, SEED_MODULES };
