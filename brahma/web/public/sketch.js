// ============================================================================
//  BRAHMA · ETZ CHAIM — Visual Cortex
// ----------------------------------------------------------------------------
//  The front door of the Visual Cortex, rebuilt as a living Kabbalistic
//  cosmology. Organisms broadcast by the SuperCollider engine over OSC
//  (/brahma/organism/update) emanate down the Lightning Flash into the ten
//  vessels of the Tree of Life. An Ouroboros coils the cosmos as the boundary
//  of recursion; every illumined vessel contains the Tree again — fractal,
//  eternal recurrence. Music, visuals, thought, multiverses — at once.
//
//  Orchestration only: setup / draw / input / transport. The cosmology lives
//  in tree/*.js. Runs standalone (demo stream) or live (OSC over WebSocket).
// ============================================================================

let organisms = {};            // id -> { type, coherence, entropy, lastUpdate }
let socket;
let reconnectInterval = null;
let lastFrameMs = 0;

const settings = {
    maxDepth: 1,               // fractal recursion depth (0 = flat)
    recursionBudget: 6,        // max nested trees per top-level render
    ouroboros: true,
    multiverse: false,
    showHelp: false
};

let einSofPulse = 0;
let hovered = null;

// --------------------------------------------------------------------- setup
function setup() {
    // Headless video export: fixed canvas, frame clock, stepped on demand by
    // tools/render_video.mjs. No OSC/WebSocket, no realtime loop.
    if (Video.isActive()) {
        const d = Video.dims();
        createCanvas(d.w, d.h);
        pixelDensity(1);
        background(0);
        Void.seed(width, height);
        Video.installClock();
        noLoop();
        window.__brahmaRenderFrame = (i) => { Video.setFrame(i); redraw(); };
        window.__brahmaReady = true;
        return;
    }
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);
    background(0);
    Void.seed(width, height);
    connectWebSocket();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    Void.seed(width, height);
}

// ----------------------------------------------------------------- transport
function connectWebSocket() {
    socket = new WebSocket(`ws://${window.location.host}`);
    socket.onopen = () => {
        if (reconnectInterval) { clearInterval(reconnectInterval); reconnectInterval = null; }
    };
    socket.onmessage = (event) => {
        try { handleOsc(JSON.parse(event.data)); } catch (e) { /* ignore */ }
    };
    socket.onclose = () => {
        if (!reconnectInterval) {
            reconnectInterval = setInterval(connectWebSocket, 3000);
        }
    };
    socket.onerror = () => socket.close();
}

// OSC args arrive as [{type,value}, ...] (osc.js metadata mode).
function handleOsc(msg) {
    if (msg.address === "/brahma/organism/update" ||
        msg.address === "/ableton/organism/update") {
        // Live engine speaks: on the handoff, purge any synthetic demo
        // organisms so real + demo streams never co-mingle in the counts.
        if (DemoStream.isActive()) DemoStream.clear(organisms);
        const id = msg.args[0].value;
        emitOrganism(id, msg.args[1].value, msg.args[2].value, msg.args[3].value);
        DemoStream.notifyLive();
    }
}

function emitOrganism(id, type, coherence, entropy) {
    organisms[id] = { type, coherence, entropy, lastUpdate: millis() };
}

// ---------------------------------------------------------------------- draw
function draw() {
    const now = millis();
    const dt = Math.min(0.05, (now - lastFrameMs) / 1000) || 0.016;
    lastFrameMs = now;

    // Emanation source: the audio envelope (video export) or, when the engine
    // is silent, the self-emanating demo stream.
    if (Video.isActive()) {
        Video.apply(organisms, emitOrganism, Video.currentFrame());
    } else {
        DemoStream.tick(organisms, emitOrganism);
    }

    // Decay: a vessel forgets an organism unheard for 2 seconds.
    for (const id in organisms) {
        if (now - organisms[id].lastUpdate > 2000) delete organisms[id];
    }

    // System-wide measures drive the void + the serpent.
    const stats = systemStats();
    einSofPulse += (((stats.avgCoherence) - einSofPulse)) * 0.05;

    // --- The Void --------------------------------------------------------
    Void.drawBackdrop(width, height, 1);
    Void.drawStars(width, height, 0.4 + einSofPulse * 0.6);

    // --- Tree geometry ---------------------------------------------------
    const treeH = Math.min(height * 0.86, width * 1.25);
    const box = {
        cx: width / 2,
        top: height / 2 - treeH / 2,
        treeW: treeH * 0.6,
        treeH: treeH
    };
    const center = { x: box.cx, y: box.top + treeH / 2 };

    Void.drawEinSof(box.cx, box.top, treeH * 0.9, einSofPulse);

    // --- Update cosmology state -----------------------------------------
    Tree.update(organisms, dt, settings);

    // --- Multiverse: faint parallel worlds branch out behind ------------
    if (settings.multiverse) {
        const branch = 0.05 + stats.avgEntropy * 0.04;
        const ghostSettings = Object.assign({}, settings, { maxDepth: 0, recursionBudget: 0 });
        for (let i = 1; i <= 2; i++) {
            [-1, 1].forEach(sgn => {
                push();
                translate(center.x, center.y);
                rotate(sgn * branch * i);
                scale(1 - i * 0.04);
                translate(-center.x, -center.y);
                // base alpha on p5's 0–255 RGB scale (faint parallel worlds)
                Tree.render(box, 0, 40 / i, ghostSettings);
                pop();
            });
        }
    }

    // --- Ouroboros: the boundary of recursion ---------------------------
    if (settings.ouroboros) {
        const ringR = treeH * 0.54;
        Ouroboros.draw(center.x, center.y, ringR, stats.avgEntropy,
                       stats.avgCoherence, (now * 0.00002) % 1);
    }

    // --- The Tree (rendered last so picking reflects the true world) ----
    // Base alpha is on p5's default 0–255 RGB scale; the renderer's internal
    // multipliers (alpha * 0.04 … 1.0) then span the full ~10–255 range.
    Tree.render(box, 0, 255, settings);

    // --- The four trait-axes of the active substrate --------------------
    // (rhyming with AdamKadmon's canonical four: spectral_profile,
    //  temporal_topology, modulation_graph, performance_response)
    const axisVals = [
        stats.avgCoherence,
        0.5 + 0.5 * Math.sin(now * 0.0003),
        constrain(stats.litCount / 10, 0, 1),
        constrain(stats.avgEntropy / 5, 0, 1)
    ];

    // --- HUD -------------------------------------------------------------
    // A clean export shows pure cosmos; the dev overlay is suppressed in video
    // mode unless explicitly requested (__BRAHMA_VIDEO__.hud).
    if (!Video.isActive() || Video.wantHud()) {
        Hud.drawTitle();
        Hud.drawSubstrate(Substrates.LIST, Substrates.active(), axisVals);
        Hud.drawStatus({
            live: !DemoStream.isActive(),
            litCount: stats.litCount,
            orgCount: Object.keys(organisms).length,
            maxDepth: settings.maxDepth,
            ouroboros: settings.ouroboros,
            multiverse: settings.multiverse
        });
        Hud.drawTooltip(hovered);
        Hud.drawHelp(settings.showHelp);
    }
}

function systemStats() {
    let cSum = 0, eSum = 0, n = 0, lit = 0;
    const seats = {};
    for (const id in organisms) {
        const o = organisms[id];
        cSum += o.coherence; eSum += o.entropy; n++;
        seats[Substrates.seatFor(o.type)] = true;
    }
    lit = Object.keys(seats).length;
    return {
        avgCoherence: n ? cSum / n : 0.15,
        avgEntropy: n ? eSum / n : 0.4,
        litCount: lit
    };
}

// --------------------------------------------------------------------- input
function mouseMoved() {
    hovered = Tree.pick(mouseX, mouseY);
}

function retune() {
    // Retuning the synthesizer to another reality: clear the prior emanation.
    DemoStream.clear(organisms);
    for (const id in organisms) delete organisms[id];
    hovered = null;
    Tree.triggerFlash();
}

function keyPressed() {
    if (key === " ") Tree.triggerFlash();
    else if (key === "+" || key === "=") settings.maxDepth = Math.min(3, settings.maxDepth + 1);
    else if (key === "-" || key === "_") settings.maxDepth = Math.max(0, settings.maxDepth - 1);
    else if (key === "o" || key === "O") settings.ouroboros = !settings.ouroboros;
    else if (key === "m" || key === "M") settings.multiverse = !settings.multiverse;
    else if (key === "d" || key === "D") DemoStream.toggle();
    else if (key === "h" || key === "H") settings.showHelp = !settings.showHelp;
    else if (key === "s" || key === "S") saveCanvas("brahma-etz-chaim", "png");
    else if (key === "t" || key === "T") { Substrates.cycle(1); retune(); }
    else if ("1234".includes(key)) { if (Substrates.byKey(key)) retune(); }
}
