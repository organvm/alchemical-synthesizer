// ============================================================================
//  THE VOID — Ein Sof, the limitless ground from which the Tree emanates.
// ----------------------------------------------------------------------------
//  A drifting field of stars and nebular dust, crowned by the boundless light
//  that pours down into Keter. This is the canvas behind the cosmos.
// ============================================================================

const Void = (() => {
    let stars = [];

    function seed(w, h) {
        stars = [];
        const n = Math.floor((w * h) / 5200);
        for (let i = 0; i < n; i++) {
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                z: Math.random(),                 // depth → size & twinkle rate
                tw: Math.random() * TWO_PI
            });
        }
    }

    // trailMix: 0..1 — how much of the previous frame survives (motion trails)
    function drawBackdrop(w, h, trailMix) {
        // Translucent wash gives luminous trails to everything drawn after.
        noStroke();
        fill(4, 3, 10, map(trailMix, 0, 1, 60, 12));
        rect(0, 0, w, h);
    }

    function drawStars(w, h, intensity) {
        noStroke();
        const t = millis() * 0.001;
        for (const s of stars) {
            const tw = 0.5 + 0.5 * Math.sin(t * (0.4 + s.z) + s.tw);
            const size = (0.4 + s.z * 1.8) * (0.6 + tw * 0.4);
            const b = (40 + s.z * 160) * (0.5 + 0.5 * intensity) * (0.6 + tw * 0.4);
            fill(200, 210, 255, b);
            circle(s.x, s.y, size);
        }
    }

    // The crown of boundless light descending from above into Keter.
    function drawEinSof(cx, topY, w, pulse) {
        push();
        const g = drawingContext;
        const rad = w * (0.22 + pulse * 0.05);
        const grd = g.createRadialGradient(cx, topY - rad * 0.3, 0, cx, topY - rad * 0.3, rad);
        grd.addColorStop(0, `rgba(255,255,255,${0.16 + pulse * 0.12})`);
        grd.addColorStop(0.4, `rgba(190,205,255,${0.06 + pulse * 0.05})`);
        grd.addColorStop(1, "rgba(120,140,255,0)");
        g.fillStyle = grd;
        g.fillRect(cx - rad, topY - rad, rad * 2, rad * 2);
        pop();
    }

    return { seed, drawBackdrop, drawStars, drawEinSof };
})();
