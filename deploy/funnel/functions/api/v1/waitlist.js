// ============================================================================
//  functions/api/v1/waitlist.js — the free funnel's capture endpoint.
// ----------------------------------------------------------------------------
//  A Cloudflare Pages Function. The static radio-station home (product/public/
//  home) POSTs { email, interest } here; each signup is appended to the
//  AETHER_WAITLIST KV namespace (bound in wrangler.toml). This is what makes
//  the "free funnel" an actual funnel: demand is captured durably, in the
//  owner's OWN Cloudflare account (sovereign, private, $0) — no third-party
//  form service, no cross-service credential shipped into the function.
//
//  Read the list back (authenticated, never public):
//    wrangler kv key list  --namespace-id <AETHER_WAITLIST id>
//    wrangler kv key get "wl:<email>" --namespace-id <id>
//
//  Same-origin (page + function both on aether.pages.dev) => no CORS needed.
// ============================================================================

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// POST — capture a signup. Idempotent per-email (re-POST refreshes last_seen).
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const email = String((body && body.email) || "").trim().toLowerCase();
  const interest = String((body && body.interest) || "aether").slice(0, 64);

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "invalid email" }, 400);
  }
  if (!env.AETHER_WAITLIST) {
    // Binding missing (e.g. a preview without KV) — fail honestly, don't 200.
    return json({ error: "capture unavailable" }, 503);
  }

  const key = "wl:" + email;
  const now = new Date().toISOString(); // Date is available in Workers runtime.

  let record;
  const existing = await env.AETHER_WAITLIST.get(key);
  if (existing) {
    record = { ...JSON.parse(existing), interest, last_seen: now };
  } else {
    record = {
      email,
      interest,
      joined: now,
      ref: (new URL(request.url)).searchParams.get("ref") || "",
      ua: (request.headers.get("user-agent") || "").slice(0, 200),
    };
  }

  await env.AETHER_WAITLIST.put(key, JSON.stringify(record));
  return json({ ok: true, joined: record.joined }, 200);
}

// Never expose the captured list over HTTP. Reads are authenticated (wrangler).
export async function onRequestGet() {
  return json({ error: "method not allowed" }, 405);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
