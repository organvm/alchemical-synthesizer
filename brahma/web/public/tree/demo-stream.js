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

    // A rotating cast of organisms drifting through coherence/entropy space.
    const CAST = [
        "Proteus", "Relinquished", "Golem", "Typhon", "AgentSmith", "Ditto",
        "Additive", "Wavetable", "PD", "Granular", "Formant", "WestCoast"
    ];
    const seeds = CAST.map((type, i) => ({
        id: 9000 + i,
        type,
        phase: i * 1.37,
        rate: 0.18 + (i % 5) * 0.05
    }));

    function notifyLive() { lastLiveMs = millis(); }
    function isActive() { return enabled && (millis() - lastLiveMs) > QUIET_MS; }
    function toggle() { enabled = !enabled; return enabled; }

    // Push synthetic organism state for this frame.
    function tick(organisms, emit) {
        if (!isActive()) return;
        const t = millis() * 0.001;
        // breathe a slowly varying subset into existence
        const activeCount = 5 + Math.floor(3 * (0.5 + 0.5 * Math.sin(t * 0.18)));
        for (let i = 0; i < seeds.length; i++) {
            const s = seeds[i];
            const alive = ((Math.sin(t * 0.13 + s.phase) * 0.5 + 0.5) * seeds.length) < activeCount;
            if (!alive) { delete organisms[s.id]; continue; }
            const coherence = 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.rate + s.phase));
            const entropy = 1.5 + 3.5 * noise(s.id * 0.5 + t * 0.25);
            emit(s.id, s.type, coherence, entropy);
        }
    }

    return { tick, notifyLive, isActive, toggle, get enabled() { return enabled; } };
})();
