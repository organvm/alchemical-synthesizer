// ============================================================================
//  DEMO STREAM — a self-emanating cosmos.
// ----------------------------------------------------------------------------
//  When no live SuperCollider engine is broadcasting, the Tree must not go
//  dark. This generator breathes synthetic organisms into the vessels so the
//  cosmology lives on `npm start` alone. It writes into the SAME `organisms`
//  map the real OSC stream feeds, via the SAME update path.
// ============================================================================

const DemoStream = (() => {
    let enabled = true;          // user-toggleable
    let lastLiveMs = -99999;     // timestamp of last real OSC organism update
    const QUIET_MS = 2500;       // silence before the demo takes over

    function notifyLive() { lastLiveMs = millis(); }
    function isActive() { return enabled && (millis() - lastLiveMs) > QUIET_MS; }
    function toggle() { enabled = !enabled; return enabled; }

    // Push synthetic organism state for this frame — emanating the vocabulary
    // of whichever substrate (Sound / Idea / Product / Cosmos) is tuned in.
    function tick(organisms, emit) {
        if (!isActive()) return;
        const t = millis() * 0.001;
        const cast = Substrates.active().organisms;
        // breathe a slowly varying subset of this reality into existence
        const activeCount = 5 + Math.floor(3 * (0.5 + 0.5 * Math.sin(t * 0.18)));
        for (let i = 0; i < cast.length; i++) {
            const id = 9000 + i;
            const phase = i * 1.37;
            const rate = 0.18 + (i % 5) * 0.05;
            const alive = ((Math.sin(t * 0.13 + phase) * 0.5 + 0.5) * cast.length) < activeCount;
            if (!alive) { delete organisms[id]; continue; }
            const coherence = 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(t * rate + phase));
            const entropy = 1.5 + 3.5 * noise(id * 0.5 + t * 0.25);
            emit(id, cast[i].type, coherence, entropy);
        }
    }

    // Clear synthetic organisms (e.g. when retuning to another substrate).
    function clear(organisms) {
        for (let i = 0; i < 64; i++) delete organisms[9000 + i];
    }

    return { tick, clear, notifyLive, isActive, toggle, get enabled() { return enabled; } };
})();
