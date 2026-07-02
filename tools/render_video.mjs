#!/usr/bin/env node
// ============================================================================
//  render_video.mjs — headless frame renderer for the Visual Cortex.
// ----------------------------------------------------------------------------
//  Runs the REAL p5 sketch (brahma/web/public) in headless Chrome via Puppeteer,
//  injects a per-frame audio envelope (from tools/analyze_audio.py) as
//  window.__BRAHMA_VIDEO__, and steps the cosmos one deterministic frame at a
//  time — writing frame_%06d.png for tools/videotrack.sh to mux with ffmpeg.
//
//  Puppeteer is a provisioned-on-demand tool (tools/setup-video.sh installs it
//  into brahma/web/node_modules, gitignored) — never in the committed manifest,
//  so CI's `npm ci` never pulls Chromium. Resolved here via createRequire.
//
//  Usage:
//    node tools/render_video.mjs --env env.json --frames DIR \
//         [--width 1080] [--height 1080] [--fps 30] [--substrate sound] [--hud]
//
//  Exit: 0 ok · 2 usage · 3 puppeteer missing · 4 render failure
// ============================================================================

import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const WEB_ROOT = path.join(REPO_ROOT, "brahma", "web");
const INDEX_HTML = path.join(WEB_ROOT, "public", "index.html");

function parseArgs(argv) {
    const a = { width: 1080, height: 1080, fps: 30, substrate: "sound", hud: false };
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i];
        if (k === "--env") a.env = argv[++i];
        else if (k === "--frames") a.frames = argv[++i];
        else if (k === "--width") a.width = parseInt(argv[++i], 10);
        else if (k === "--height") a.height = parseInt(argv[++i], 10);
        else if (k === "--fps") a.fps = parseInt(argv[++i], 10);
        else if (k === "--substrate") a.substrate = argv[++i];
        else if (k === "--hud") a.hud = true;
        else { console.error(`render_video: unknown arg ${k}`); process.exit(2); }
    }
    return a;
}

function loadPuppeteer() {
    try {
        const require = createRequire(path.join(WEB_ROOT, "package.json"));
        return require("puppeteer");
    } catch (e) {
        console.error(
            "render_video: puppeteer not installed.\n" +
            "  Run:  make video   (or: bash tools/setup-video.sh)\n" +
            `  (${e.message})`);
        process.exit(3);
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.env || !args.frames) {
        console.error("usage: node tools/render_video.mjs --env env.json --frames DIR [opts]");
        process.exit(2);
    }
    if (!fs.existsSync(args.env)) {
        console.error(`render_video: no such env file: ${args.env}`);
        process.exit(2);
    }
    if (!fs.existsSync(INDEX_HTML)) {
        console.error(`render_video: cannot find sketch at ${INDEX_HTML}`);
        process.exit(2);
    }

    const envelope = JSON.parse(fs.readFileSync(args.env, "utf-8"));
    const frames = (envelope.env || []).length;
    if (!frames) {
        console.error("render_video: envelope has no frames");
        process.exit(2);
    }
    fs.mkdirSync(args.frames, { recursive: true });

    const cfg = {
        fps: args.fps,
        width: args.width,
        height: args.height,
        substrate: args.substrate,
        hud: args.hud,
        env: envelope.env,
    };

    const puppeteer = loadPuppeteer();
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--hide-scrollbars",
            "--force-color-profile=srgb",
        ],
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: args.width, height: args.height, deviceScaleFactor: 1 });
        page.on("pageerror", (e) => console.error("  [page error]", e.message));

        // Inject the envelope BEFORE any script runs, so setup() sees video mode.
        await page.evaluateOnNewDocument((injected) => {
            window.__BRAHMA_VIDEO__ = injected;
        }, cfg);

        await page.goto(pathToFileURL(INDEX_HTML).href, {
            waitUntil: "networkidle0",   // wait for the p5 CDN script
            timeout: 60000,
        });
        await page.waitForFunction("window.__brahmaReady === true", { timeout: 30000 });

        const pad = (n) => String(n).padStart(6, "0");
        const clip = { x: 0, y: 0, width: args.width, height: args.height };
        const step = Math.max(1, Math.floor(frames / 10));

        for (let i = 0; i < frames; i++) {
            await page.evaluate((f) => window.__brahmaRenderFrame(f), i);
            await page.screenshot({
                path: path.join(args.frames, `frame_${pad(i)}.png`),
                clip,
                optimizeForSpeed: true,
            });
            if (i % step === 0 || i === frames - 1) {
                console.error(`  render ${i + 1}/${frames} (${Math.round((i + 1) / frames * 100)}%)`);
            }
        }
        console.error(`render_video: ${frames} frames -> ${args.frames}`);
    } catch (e) {
        console.error("render_video: render failure:", e.message);
        await browser.close();
        process.exit(4);
    }
    await browser.close();
}

main();
