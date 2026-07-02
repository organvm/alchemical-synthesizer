// ============================================================================
//  VIDEO MODE — the offline, frame-stepped cosmos.
// ----------------------------------------------------------------------------
//  For headless export (tools/render_video.mjs): when `window.__BRAHMA_VIDEO__`
//  is injected before the sketch boots, the Visual Cortex stops listening to
//  OSC/DemoStream and instead is *driven by a rendered track's audio envelope*
//  (from tools/analyze_audio.py), one deterministic frame at a time.
//
//  The audio -> cosmos mapping:
//    * spectral bands  -> vessels, low freq at the root (Malkuth) rising to the
//      crown (Keter): bass thumps the foundation, treble sparks the crown.
//    * loudness (rms)  -> a global gain lifting every lit vessel.
//    * flatness        -> entropy: noisy = restless coronas, tonal = calm.
//    * onsets          -> the Lightning Flash fires on each transient.
//
//  Determinism: every motion in the renderer is millis()-driven. installClock()
//  overrides the global millis() with a frame clock (frameIndex / fps), so the
//  entire existing renderer becomes reproducible with no other changes.
// ============================================================================

const Video = (() => {
    const cfg = (typeof window !== "undefined" && window.__BRAHMA_VIDEO__) || null;
    const active = !!(cfg && Array.isArray(cfg.env) && cfg.env.length);

    let frame = 0;                     // current frame index (set by the harness)
    let seatType = null;               // seat key -> an organism type seated there
    let prevOnset = 0;

    function isActive() { return active; }
    function fps() { return (cfg && cfg.fps) || 30; }
    function frameCount() { return active ? cfg.env.length : 0; }
    function currentFrame() { return frame; }
    function wantHud() { return !!(cfg && cfg.hud); }
    function dims() {
        return { w: (cfg && cfg.width) || 1080, h: (cfg && cfg.height) || 1080 };
    }
    function setFrame(i) { frame = i; }

    // Replace the global wall clock with a frame clock so all millis()-driven
    // motion (shimmer, path sparks, coronas, Ouroboros, dt) advances exactly
    // 1/fps per rendered frame — making the whole cosmos reproducible.
    function installClock() {
        if (!active || typeof window === "undefined") return;
        const f = fps();
        window.millis = () => (frame / f) * 1000;
    }

    // Choose the tuned substrate (defaults to whatever is active), then build a
    // seat -> type table from it so we can light a vessel by emitting a real
    // organism that seats there.
    function selectSubstrate() {
        if (cfg && cfg.substrate && typeof Substrates !== "undefined") {
            const idx = Substrates.LIST.findIndex(
                s => s.id === cfg.substrate || s.key === cfg.substrate);
            if (idx >= 0) Substrates.setActive(idx);
        }
        seatType = {};
        if (typeof Substrates !== "undefined") {
            // first organism seated on each vessel wins that seat
            Substrates.active().organisms.forEach(o => {
                if (!seatType[o.seat]) seatType[o.seat] = o.type;
            });
        }
    }

    // Drive `organisms` for the given frame from the audio envelope.
    function apply(organisms, emit, i) {
        if (!active) return;
        frame = i;
        if (!seatType) selectSubstrate();

        const e = cfg.env[i] || cfg.env[cfg.env.length - 1];
        const bands = e.bands || [];
        const nb = bands.length || 1;
        const gain = 0.35 + 0.65 * (e.rms || 0);      // loudness lifts everything
        const entropy = 0.3 + (e.flat || 0) * 6.0;    // flatness -> corona unrest

        // Map each vessel to a band by vertical position: y~0 (crown) -> highest
        // band, y~1 (root) -> lowest band. Skip the hidden Da'at.
        COSMOS.SEPHIROT.forEach((s, si) => {
            if (s.hidden) return;
            const type = seatType[s.key];
            if (!type) return;                         // vessel uncovered by substrate
            const bi = Math.max(0, Math.min(nb - 1, Math.round((1 - s.y) * (nb - 1))));
            const coherence = Math.max(0, Math.min(1, (bands[bi] || 0) * gain));
            emit(9100 + si, type, coherence, entropy);
        });

        // Onset -> Lightning Flash, on the rising edge only.
        const onset = e.onset || 0;
        if (onset > 0.5 && prevOnset <= 0.5 && typeof Tree !== "undefined") {
            Tree.triggerFlash();
        }
        prevOnset = onset;
    }

    return {
        isActive, fps, frameCount, currentFrame, wantHud,
        dims, setFrame, installClock, apply,
    };
})();
