// ============================================================================
//  HUD — the scribe's overlay. Titles, live status, the hovered vessel's
//  testament, and the key of controls.
// ============================================================================

const Hud = (() => {
    function panel(x, y, w, h) {
        noStroke();
        fill(8, 10, 20, 150);
        rect(x, y, w, h, 8);
        stroke(120, 130, 200, 60);
        strokeWeight(1);
        noFill();
        rect(x, y, w, h, 8);
    }

    function drawTitle() {
        push();
        textAlign(LEFT, TOP);
        noStroke();
        fill(255, 255, 255, 230);
        textSize(20);
        text("BRAHMA · ETZ CHAIM", 24, 20);
        fill(150, 160, 210, 200);
        textSize(11);
        text("the recursive Tree of Life — Visual Cortex", 24, 46);
        pop();
    }

    // The substrate selector + the four trait-axes of the tuned reality.
    function drawSubstrate(list, active, axisVals) {
        push();
        textAlign(CENTER, CENTER);
        // chips, centered along the top
        const chipW = 118, gap = 10;
        const totalW = list.length * chipW + (list.length - 1) * gap;
        let x = width / 2 - totalW / 2;
        const y = 20;
        list.forEach(sub => {
            const on = sub.id === active.id;
            noStroke();
            fill(on ? color(255, 255, 255, 26) : color(8, 10, 20, 130));
            rect(x, y, chipW, 30, 6);
            stroke(on ? color(255, 220, 130, 200) : color(120, 130, 200, 50));
            strokeWeight(1); noFill();
            rect(x, y, chipW, 30, 6);
            noStroke();
            fill(on ? color(255, 235, 170, 245) : color(170, 180, 220, 170));
            textSize(12);
            text(sub.key + "  " + sub.glyph + " " + sub.name, x + chipW / 2, y + 15);
            x += chipW + gap;
        });

        // tagline + axis bars beneath the strip
        noStroke();
        fill(190, 200, 235, 180);
        textSize(10);
        text(active.tagline, width / 2, y + 44);

        const bw = 150, bx = width / 2 - bw / 2, by = y + 58;
        textAlign(LEFT, CENTER);
        active.axes.forEach((ax, i) => {
            const v = constrain(axisVals[i] || 0, 0, 1);
            const ry = by + i * 16;
            fill(150, 160, 205, 160);
            textSize(9);
            text(ax, bx, ry + 1);
            const tx = bx + 84, tw = bw - 84;
            noStroke();
            fill(40, 45, 70, 180); rect(tx, ry - 3, tw, 6, 3);
            fill(255, 220, 130, 220); rect(tx, ry - 3, tw * v, 6, 3);
        });
        pop();
    }

    function drawStatus(state) {
        push();
        const lines = [
            (state.live ? "● LIVE  SuperCollider stream" : "○ DEMO  self-emanating cosmos"),
            "vessels lit : " + state.litCount + " / 10",
            "organisms   : " + state.orgCount,
            "recursion   : depth " + state.maxDepth + (state.maxDepth ? "  (fractal)" : "  (flat)"),
            "ouroboros   : " + (state.ouroboros ? "coiled" : "released"),
            "multiverse  : " + (state.multiverse ? "branching" : "single world")
        ];
        const w = 250, h = 22 + lines.length * 17;
        const x = width - w - 18, y = 18;
        panel(x, y, w, h);
        textAlign(LEFT, TOP);
        noStroke();
        textSize(11);
        lines.forEach((l, i) => {
            fill(i === 0 ? (state.live ? color(120, 240, 160) : color(255, 200, 120))
                         : color(190, 200, 235, 220));
            text(l, x + 14, y + 12 + i * 17);
        });
        pop();
    }

    function drawHelp(show) {
        if (!show) {
            push();
            textAlign(LEFT, BOTTOM);
            noStroke();
            fill(150, 160, 200, 150);
            textSize(11);
            text("press  H  for the key of controls", 24, height - 18);
            pop();
            return;
        }
        const rows = [
            ["1–4 / T", "retune the synthesizer: Sound · Idea · Product · Cosmos"],
            ["SPACE", "summon the Lightning Flash of creation"],
            ["+ / -", "deepen / withdraw the fractal recursion"],
            ["O", "coil / release the Ouroboros"],
            ["M", "branch / collapse the multiverse"],
            ["D", "toggle the self-emanating demo stream"],
            ["S", "save the cosmos as an image"],
            ["H", "hide this key"]
        ];
        push();
        const w = 360, h = 30 + rows.length * 20;
        const x = 24, y = height - h - 16;
        panel(x, y, w, h);
        textAlign(LEFT, TOP);
        noStroke();
        fill(255, 255, 255, 220);
        textSize(12);
        text("KEY OF CONTROLS", x + 16, y + 12);
        textSize(11);
        rows.forEach((r, i) => {
            fill(255, 220, 130, 230);
            text(r[0], x + 16, y + 34 + i * 20);
            fill(190, 200, 235, 220);
            text(r[1], x + 90, y + 34 + i * 20);
        });
        pop();
    }

    function drawTooltip(p) {
        if (!p) return;
        const s = p.sephirah, occ = p.occ;
        const lines = [
            s.name + " · " + s.hebrew,
            s.title + "  —  " + pillarName(s.pillar) + " pillar"
        ];
        if (occ) {
            lines.push("");
            lines.push("vessel bears: " + occ.type + " [" + occ.id + "]");
            lines.push("coherence : " + occ.coherence.toFixed(2));
            lines.push("entropy   : " + occ.entropy.toFixed(2));
        } else {
            lines.push("");
            lines.push("(empty vessel — awaiting emanation)");
        }
        const w = 230, h = 18 + lines.length * 16;
        let x = p.x + p.r + 14, y = p.y - h / 2;
        if (x + w > width) x = p.x - p.r - 14 - w;
        y = constrain(y, 8, height - h - 8);
        push();
        panel(x, y, w, h);
        textAlign(LEFT, TOP);
        noStroke();
        textSize(11);
        lines.forEach((l, i) => {
            fill(i === 0 ? color(255, 255, 255, 235) : color(185, 195, 230, 215));
            if (i === 0) textSize(13); else textSize(11);
            text(l, x + 12, y + 10 + i * 16 + (i === 0 ? 0 : 2));
        });
        pop();
    }

    function pillarName(p) {
        return p === "left" ? "Severity" : p === "right" ? "Mercy" : "Mildness";
    }

    return { drawTitle, drawSubstrate, drawStatus, drawHelp, drawTooltip };
})();
