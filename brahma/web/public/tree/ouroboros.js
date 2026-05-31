// ============================================================================
//  OUROBOROS — the serpent that encircles the cosmos and devours its own tail.
// ----------------------------------------------------------------------------
//  It is the boundary of the world-tree and the emblem of recursion: where its
//  mouth meets its tail, the cosmos wraps back into itself. Its writhe answers
//  to the system's entropy; its glow answers to coherence.
// ============================================================================

const Ouroboros = (() => {
    const SEGMENTS = 220;          // body resolution
    const MOUTH_GAP = 0.16;        // fraction of the ring left open at the head
    let phase = 0;                 // slow rotation of the whole serpent

    // Draw the serpent around center (cx,cy) at the given radius.
    //   entropy   : 0..~5  drives the writhe amplitude
    //   coherence : 0..1   drives luminosity
    //   hueShift  : 0..1   slow chromatic drift (eternal recurrence of color)
    function draw(cx, cy, radius, entropy, coherence, hueShift) {
        phase += 0.0016 + entropy * 0.0009;
        const writhe = map(constrain(entropy, 0, 5), 0, 5, 1.5, 14);
        const open = MOUTH_GAP * TWO_PI;
        const span = TWO_PI - open;

        push();
        translate(cx, cy);
        rotate(phase);

        // --- Body ------------------------------------------------------------
        // Walk from tail (thin) to head (thick), undulating in and out.
        const pts = [];
        for (let i = 0; i <= SEGMENTS; i++) {
            const t = i / SEGMENTS;                 // 0 tail → 1 head
            const a = open / 2 + t * span;          // angular position
            const wob = sin(a * 6 + phase * 5 + t * 8) * writhe
                      + sin(a * 13 - phase * 3) * writhe * 0.4;
            const r = radius + wob;
            pts.push({ x: cos(a) * r, y: sin(a) * r, t, a });
        }

        colorMode(HSB, 360, 100, 100, 100);
        const baseHue = (200 + hueShift * 360) % 360;
        noFill();
        // Two passes: an outer aura and the scaled body.
        for (let pass = 0; pass < 2; pass++) {
            const outer = pass === 0;
            for (let i = 0; i < pts.length - 1; i++) {
                const p = pts[i], q = pts[i + 1];
                const thick = (2 + p.t * p.t * 16) * (outer ? 2.4 : 1);
                const bri = (outer ? 35 : 70) + coherence * 25;
                const sat = 55 + p.t * 30;
                const alpha = (outer ? 14 : 60) + p.t * 25;
                stroke((baseHue + p.t * 40) % 360, sat, bri, alpha);
                strokeWeight(thick);
                line(p.x, p.y, q.x, q.y);
            }
        }

        // --- Scales (dorsal glints) -----------------------------------------
        for (let i = 6; i < pts.length - 2; i += 5) {
            const p = pts[i];
            const s = 1.4 + p.t * 3.5;
            fill((baseHue + 30) % 360, 30, 95, 18 + p.t * 25);
            noStroke();
            circle(p.x, p.y, s);
        }

        // --- Head & devouring mouth -----------------------------------------
        const head = pts[pts.length - 1];
        const tail = pts[0];
        const hr = 10 + coherence * 10;
        noStroke();
        // glow halo
        fill(baseHue, 60, 100, 22);
        circle(head.x, head.y, hr * 3.4);
        // skull
        fill((baseHue + 18) % 360, 50, 88, 92);
        circle(head.x, head.y, hr * 2);
        // eye
        fill(8, 90, 100, 95);
        const eang = head.a + HALF_PI;
        circle(head.x + cos(eang) * hr * 0.5, head.y + sin(eang) * hr * 0.5, hr * 0.7);
        fill(0, 0, 0, 95);
        circle(head.x + cos(eang) * hr * 0.5, head.y + sin(eang) * hr * 0.5, hr * 0.3);
        // the tail being swallowed — drawn entering the mouth
        stroke((baseHue + 40) % 360, 40, 70, 70);
        strokeWeight(2.2);
        noFill();
        line(head.x, head.y, tail.x, tail.y);

        colorMode(RGB, 255, 255, 255, 255);
        pop();
    }

    return { draw };
})();
