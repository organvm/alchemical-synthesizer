// ============================================================================
//  config.js — the ONE deploy knob for the AETHER radio-station home.
// ----------------------------------------------------------------------------
//  This landing page is static: it can be served by the Foundry (product/) at /
//  OR deployed as-is to Cloudflare Pages / Vercel. It talks to two backends,
//  both overridable here so the same files deploy anywhere:
//
//    streamBase — where the LIVE HLS stream + telemetry live (tools/broadcast.sh
//                 output, served at /live by product/server.js or brahma/web).
//    apiBase    — the Foundry REST API (/api/v1): the packaged-track archive
//                 (/specimens) and the waitlist (/waitlist).
//
//  Defaults are same-origin relative paths, so served-by-the-Foundry "just
//  works." For a split static deploy, set absolute URLs (e.g. a Cloud Run API +
//  an R2/Pages stream origin) at deploy time — no rebuild.
// ============================================================================
window.AETHER = {
    streamBase: "/live",      // -> /live/stream.m3u8 , /live/telemetry.json
    apiBase: "/api/v1",       // -> /api/v1/specimens , /api/v1/waitlist
    stationName: "AETHER",
    tagline: "a living radio — Brahma listens, transmutes, and broadcasts its own",
};
