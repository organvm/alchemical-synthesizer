// ============================================================================
//  TREE RENDERER — the recursive Etz Chaim.
// ----------------------------------------------------------------------------
//  Draws the three pillars, the 22 paths, the Lightning Flash of emanation,
//  and the ten vessels. Every sufficiently illumined vessel contains the whole
//  Tree again, scaled and dimmed — the fractal of eternal recurrence.
// ============================================================================

const Tree = (() => {
    const energy = {};                 // key -> smoothed luminosity 0..1
    COSMOS.SEPHIROT.forEach(s => { energy[s.key] = 0.06; });

    // Lightning Flash state: a bolt of creation descending the vessels.
    const flash = { active: false, prog: 0, speed: 5.2 };
    let flashTimer = 0;
    const FLASH_PERIOD = 8.5;          // seconds between automatic flashes

    let occupants = {};                // key -> organism (per frame)
    let topPositions = {};             // key -> {x,y,r} at depth 0 (for picking)
    let recursionBudget = 0;           // per-frame cap to bound nested trees

    // ------------------------------------------------------------------ state
    function buildOccupants(organisms) {
        const map = {};
        for (const id in organisms) {
            const o = organisms[id];
            const seat = COSMOS.seatFor(o.type);
            // strongest (most coherent) organism wins a contested vessel
            if (!map[seat] || o.coherence > map[seat].coherence) {
                map[seat] = Object.assign({ id }, o);
            }
        }
        return map;
    }

    function update(organisms, dt, settings) {
        occupants = buildOccupants(organisms);

        // Automatic Lightning Flash
        flashTimer += dt;
        if (!flash.active && flashTimer >= FLASH_PERIOD) {
            triggerFlash();
        }
        if (flash.active) {
            flash.prog += flash.speed * dt;
            if (flash.prog >= COSMOS.LIGHTNING.length + 0.5) {
                flash.active = false;
                flashTimer = 0;
            }
        }

        // Smooth per-vessel energy toward its target
        COSMOS.SEPHIROT.forEach(s => {
            let target = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(millis() * 0.001 + s.x * 9));
            const occ = occupants[s.key];
            if (occ) target = Math.max(target, 0.25 + occ.coherence * 0.75);
            // Lightning boost
            if (flash.active) {
                const d = Math.abs(flash.prog - COSMOS.LIGHTNING.indexOf(s.key));
                if (d < 1) target = Math.max(target, 1 - d);
            }
            energy[s.key] += (target - energy[s.key]) * Math.min(1, dt * 6);
        });
    }

    function triggerFlash() {
        flash.active = true;
        flash.prog = -0.5;
        flashTimer = 0;
    }

    // -------------------------------------------------------------- rendering
    function render(box, depth, alpha, settings) {
        if (depth === 0) {
            topPositions = {};
            recursionBudget = settings.recursionBudget;
        }

        if (depth === 0) drawPillars(box, alpha);
        drawPaths(box, depth, alpha);
        if (flash.active && depth === 0) drawLightning(box, alpha);

        const nodeR = box.treeW * 0.072;
        COSMOS.SEPHIROT.forEach(s => {
            const p = COSMOS.nodePos(s, box);
            const e = energy[s.key];
            const occ = occupants[s.key];
            const r = nodeR * (0.78 + e * 0.55);
            if (depth === 0) topPositions[s.key] = { x: p.x, y: p.y, r, sephirah: s, occ };
            drawSephirah(s, p.x, p.y, r, e, occ, alpha, depth);

            // Fractal recursion: an illumined vessel contains the Tree anew.
            if (depth < settings.maxDepth && e > 0.5 && recursionBudget > 0 && !s.hidden) {
                recursionBudget--;
                const childTreeH = r * 1.85;
                const childBox = {
                    cx: p.x,
                    top: p.y - childTreeH / 2,
                    treeW: childTreeH * 0.6,
                    treeH: childTreeH
                };
                push();
                drawingContext.save();
                render(childBox, depth + 1, alpha * 0.55 * e, settings);
                drawingContext.restore();
                pop();
            }
        });
    }

    function drawPillars(box, alpha) {
        const pillars = [
            { x: 0.20, col: [255, 70, 70], label: "SEVERITY" },   // left
            { x: 0.50, col: [255, 215, 120], label: "MILDNESS" }, // middle
            { x: 0.80, col: [95, 180, 255], label: "MERCY" }      // right
        ];
        pillars.forEach(pil => {
            const x = box.cx + (pil.x - 0.5) * box.treeW;
            const top = box.top + box.treeH * 0.02;
            const bot = box.top + box.treeH * 0.97;
            for (let w = 26; w > 0; w -= 6) {
                stroke(pil.col[0], pil.col[1], pil.col[2], alpha * 0.05);
                strokeWeight(w);
                line(x, top, x, bot);
            }
        });
    }

    function drawPaths(box, depth, alpha) {
        COSMOS.PATHS.forEach(path => {
            const a = COSMOS.nodePos(COSMOS.BY_KEY[path.a], box);
            const b = COSMOS.nodePos(COSMOS.BY_KEY[path.b], box);
            const ea = energy[path.a], eb = energy[path.b];
            const live = Math.min(ea, eb);

            // base channel
            stroke(190, 195, 230, alpha * (0.08 + live * 0.22));
            strokeWeight(1 + live * 2.2);
            line(a.x, a.y, b.x, b.y);

            // traveling spark when both vessels burn
            if (live > 0.35) {
                const t = (Math.sin(millis() * 0.0012 + path.index * 1.3) * 0.5 + 0.5);
                const sx = lerp(a.x, b.x, t), sy = lerp(a.y, b.y, t);
                noStroke();
                fill(255, 255, 255, alpha * live * 0.9);
                circle(sx, sy, 3 + live * 4);
            }

            // Hebrew letter at the path's heart (top level only)
            if (depth === 0 && box.treeW > 320) {
                noStroke();
                fill(220, 220, 255, alpha * (0.18 + live * 0.5));
                textAlign(CENTER, CENTER);
                textSize(constrain(box.treeW * 0.018, 9, 16));
                text(path.letter, (a.x + b.x) / 2, (a.y + b.y) / 2);
            }
        });
    }

    function drawLightning(box, alpha) {
        const seq = COSMOS.LIGHTNING;
        const head = constrain(flash.prog, 0, seq.length - 1);
        for (let i = 0; i < Math.floor(head); i++) {
            const a = COSMOS.nodePos(COSMOS.BY_KEY[seq[i]], box);
            const b = COSMOS.nodePos(COSMOS.BY_KEY[seq[i + 1]], box);
            const fade = 1 - (head - i) / seq.length;
            drawBolt(a, b, alpha * (0.4 + fade * 0.6));
        }
        // bright leading bolt
        const fi = Math.floor(head);
        if (fi < seq.length - 1) {
            const a = COSMOS.nodePos(COSMOS.BY_KEY[seq[fi]], box);
            const b = COSMOS.nodePos(COSMOS.BY_KEY[seq[fi + 1]], box);
            const t = head - fi;
            drawBolt(a, { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }, alpha);
        }
    }

    function drawBolt(a, b, alpha) {
        const segs = 7;
        let px = a.x, py = a.y;
        stroke(255, 255, 255, alpha);
        for (let pass = 0; pass < 2; pass++) {
            strokeWeight(pass === 0 ? 6 : 2);
            stroke(pass === 0 ? color(160, 200, 255, alpha * 0.4) : color(255, 255, 255, alpha));
            px = a.x; py = a.y;
            for (let i = 1; i <= segs; i++) {
                const t = i / segs;
                const jit = (i === segs) ? 0 : (Math.random() - 0.5) * 14;
                const nx = lerp(a.x, b.x, t) + jit;
                const ny = lerp(a.y, b.y, t) + jit;
                line(px, py, nx, ny);
                px = nx; py = ny;
            }
        }
    }

    function drawSephirah(s, x, y, r, e, occ, alpha, depth) {
        const baseCol = occ ? COSMOS.colorFor(occ.type) : s.color;
        // blend vessel's own color with its occupant
        const col = occ
            ? [lerp(s.color[0], baseCol[0], 0.7), lerp(s.color[1], baseCol[1], 0.7), lerp(s.color[2], baseCol[2], 0.7)]
            : s.color;

        push();
        translate(x, y);

        // aura
        noStroke();
        for (let g = 4; g >= 1; g--) {
            fill(col[0], col[1], col[2], alpha * 0.04 * e * g);
            circle(0, 0, r * (2.2 + g * 0.6));
        }

        // entropy corona — a jittered ring, restless in proportion to chaos
        const entropy = occ ? occ.entropy : 0.5;
        const jitter = map(constrain(entropy, 0, 10), 0, 10, 1, r * 0.5);
        noFill();
        stroke(col[0], col[1], col[2], alpha * (0.4 + e * 0.5));
        strokeWeight(s.hidden ? 0.8 : 1.6);
        if (s.hidden) drawingContext.setLineDash([4, 6]);
        beginShape();
        for (let ang = 0; ang < TWO_PI; ang += 0.22) {
            const off = map(noise(ang + millis() * 0.0011 + s.x * 5), 0, 1, -jitter, jitter);
            vertex(cos(ang) * (r + off), sin(ang) * (r + off));
        }
        endShape(CLOSE);
        drawingContext.setLineDash([]);

        // luminous core
        fill(col[0], col[1], col[2], alpha * (0.18 + e * 0.55));
        noStroke();
        circle(0, 0, r * (occ ? 1.1 : 0.7) * (0.85 + e * 0.3));
        fill(255, 255, 255, alpha * e * 0.6);
        circle(0, 0, r * 0.3);

        // inscriptions (top two levels only — avoids clutter deep in the fractal)
        if (depth <= 1 && r > 16) {
            textAlign(CENTER, CENTER);
            fill(255, 255, 255, alpha * (0.55 + e * 0.45));
            textSize(constrain(r * 0.42, 9, 20));
            text(s.hebrew, 0, -2);
            fill(col[0], col[1], col[2], alpha * (0.65 + e * 0.35));
            textSize(constrain(r * 0.32, 7, 13));
            text(s.name.toUpperCase(), 0, r + 12);
            if (occ) {
                fill(255, 255, 255, alpha * 0.85);
                textSize(constrain(r * 0.26, 6, 11));
                text(occ.type, 0, r + 26);
            }
        }
        pop();
    }

    // Return the sephirah under a screen point (top level only).
    function pick(mx, my) {
        let hit = null;
        for (const key in topPositions) {
            const p = topPositions[key];
            if (dist(mx, my, p.x, p.y) < p.r * 1.2) hit = p;
        }
        return hit;
    }

    return { update, render, pick, triggerFlash, get topPositions() { return topPositions; } };
})();
