// ============================================================================
//  home.js — the AETHER radio-station funnel: live player + archive + waitlist.
// ----------------------------------------------------------------------------
//  AETHER plan increment 2 (docs/AETHER-BROADCAST-PLAN.md §5.2): the landing
//  page IS the funnel. Static + config-driven (see config.js) so it deploys to
//  Cloudflare Pages / Vercel or is served by the Foundry at /. Every backend
//  call degrades gracefully — the page is legible even with no live stream, no
//  archive API, and no waitlist endpoint (so a pure-static deploy still works
//  as a capture surface).
// ============================================================================
(function () {
    "use strict";

    var CFG = window.AETHER || {};
    var STREAM_BASE = (CFG.streamBase || "/live").replace(/\/$/, "");
    var API_BASE = (CFG.apiBase || "/api/v1").replace(/\/$/, "");
    var STREAM = STREAM_BASE + "/stream.m3u8";
    var TELEMETRY = STREAM_BASE + "/telemetry.json";
    var $ = function (id) { return document.getElementById(id); };

    if (CFG.stationName) $("station").textContent = CFG.stationName;
    if (CFG.tagline) $("tagline").textContent = CFG.tagline;

    // ---- 1. Live player (HLS.js, Safari-native fallback) ----------------
    var audio = $("audio");
    function attach() {
        if (window.Hls && window.Hls.isSupported()) {
            var hls = new window.Hls({ liveSyncDurationCount: 3, enableWorker: true });
            hls.loadSource(STREAM);
            hls.attachMedia(audio);
            hls.on(window.Hls.Events.MANIFEST_PARSED, function () { $("hint").textContent = "On air — press play."; });
            hls.on(window.Hls.Events.ERROR, function (evt, data) {
                if (data && data.fatal) {
                    if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) setTimeout(function () { hls.startLoad(); }, 1500);
                    else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
                }
            });
        } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
            audio.src = STREAM;
            $("hint").textContent = "On air (native HLS) — press play.";
        } else {
            $("hint").textContent = "This browser can't play HLS — try Safari or a Chromium/Firefox build.";
        }
    }

    // ---- 2. Organism telemetry (provisional inner life) -----------------
    function pct(v) { return Math.round((Number(v) || 0) * 100); }
    function setLive(on) {
        $("liveflag").className = "live" + (on ? "" : " off");
        $("livetext").textContent = on ? "on air" : "offline";
    }
    var strikes = 0;
    function poll() {
        fetch(TELEMETRY, { cache: "no-store" })
            .then(function (r) { if (!r.ok) throw 0; return r.json(); })
            .then(function (t) {
                var n = t && t.now; if (!n) return;
                strikes = 0; setLive(true);
                $("phase").textContent = n.phase.toUpperCase();
                $("phase").className = "badge phase-" + n.phase;
                $("creature").textContent = n.creature.replace(/-/g, " ");
                $("epoch").textContent = "epoch " + n.epoch + (n.reborn ? " · ⟲ reborn" : "");
                $("bar-coherence").style.width = pct(n.coherence) + "%";
                $("bar-entropy").style.width = pct(n.entropy) + "%";
            })
            .catch(function () { if (++strikes >= 2) setLive(false); });
    }

    // ---- 3. Archive (packaged specimens = the shop) --------------------
    function card(s) {
        var el = document.createElement("article");
        el.className = "spec";
        var price = s.priceCents ? "$" + (s.priceCents / 100).toFixed(2) : "free";
        var audioUrl = s.id ? (API_BASE + "/specimens/" + encodeURIComponent(s.id) + "/audio") : s.audioUrl;
        el.innerHTML =
            '<div class="spec-top"><span class="spec-title"></span><span class="spec-price"></span></div>' +
            '<div class="spec-meta"></div>';
        el.querySelector(".spec-title").textContent = s.title || s.id || "untitled specimen";
        el.querySelector(".spec-price").textContent = price;
        el.querySelector(".spec-meta").textContent =
            (s.sourceModule ? s.sourceModule + " · " : "") + (s.creator || "Brahma");
        if (audioUrl) {
            var a = document.createElement("audio");
            a.controls = true; a.preload = "none"; a.src = audioUrl;
            // If a specimen is simulation-only (409) or missing (404), hide the player.
            a.addEventListener("error", function () { a.remove(); });
            el.appendChild(a);
        }
        return el;
    }
    function renderArchive(list) {
        var box = $("archive-list");
        box.innerHTML = "";
        if (!list || !list.length) {
            box.innerHTML = '<div class="empty">No specimens captured yet — the first ones drop soon.</div>';
            return;
        }
        list.slice(0, 24).forEach(function (s) { box.appendChild(card(s)); });
    }
    function loadArchive() {
        // Prefer the live Foundry marketplace; fall back to a static manifest so a
        // pure-static deploy still shows an archive.
        fetch(API_BASE + "/specimens", { cache: "no-store" })
            .then(function (r) { if (!r.ok) throw 0; return r.json(); })
            .then(function (j) { renderArchive((j && j.data) || []); })
            .catch(function () {
                fetch("archive.json", { cache: "no-store" })
                    .then(function (r) { return r.ok ? r.json() : { specimens: [] }; })
                    .then(function (j) { renderArchive((j && j.specimens) || []); })
                    .catch(function () { renderArchive([]); });
            });
    }

    // ---- 4. Waitlist (capture demand; graceful when no backend) --------
    function initWaitlist() {
        var form = $("wl-form"), msg = $("wl-msg");
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var email = $("wl-email").value.trim();
            if (!email || email.indexOf("@") < 0) { msg.textContent = "Enter a valid email."; return; }
            msg.textContent = "…";
            fetch(API_BASE + "/waitlist", {
                method: "POST", headers: { "content-type": "application/json" },
                body: JSON.stringify({ email: email, interest: "aether" }),
            })
                .then(function (r) { if (!r.ok) throw 0; return r.json(); })
                .then(function () { msg.textContent = "You're on the list. Welcome to the lineage."; form.reset(); })
                .catch(function () {
                    // No backend reachable (static-only deploy): don't lie about success.
                    msg.textContent = "Couldn't reach the list right now — try again shortly.";
                });
        });
    }

    attach();
    loadArchive();
    initWaitlist();
    poll();
    setInterval(poll, 2000);
})();
