// ============================================================================
//  COSMOLOGY — Static structure of the Brahma Tree of Life (Etz Chaim)
// ----------------------------------------------------------------------------
//  Ten Sephirot (+ the hidden Da'at) arranged on three pillars, bound by the
//  22 paths of the Lightning Flash of Creation. Organisms broadcast by the
//  SuperCollider engine emanate down into their vessels. This file holds only
//  data + pure helpers — no rendering, no state.
// ============================================================================

const COSMOS = (() => {
    // --- The Sephirot --------------------------------------------------------
    // Positions are normalized: x in [0,1] (0=left/Severity pillar,
    // 1=right/Mercy pillar), y in [0,1] (0=Keter/crown, 1=Malkuth/kingdom).
    const SEPHIROT = [
        { key: "keter",   name: "Keter",   title: "Crown",         hebrew: "כתר", x: 0.50, y: 0.045, pillar: "middle", color: [255, 255, 255] },
        { key: "chokmah", name: "Chokmah", title: "Wisdom",        hebrew: "חכמה", x: 0.80, y: 0.16,  pillar: "right",  color: [150, 205, 255] },
        { key: "binah",   name: "Binah",   title: "Understanding", hebrew: "בינה", x: 0.20, y: 0.16,  pillar: "left",   color: [125, 95, 215] },
        { key: "daat",    name: "Da'at",   title: "Knowledge",     hebrew: "דעת", x: 0.50, y: 0.275, pillar: "middle", color: [180, 185, 210], hidden: true },
        { key: "chesed",  name: "Chesed",  title: "Mercy",         hebrew: "חסד", x: 0.80, y: 0.39,  pillar: "right",  color: [95, 180, 255] },
        { key: "gevurah", name: "Gevurah", title: "Severity",      hebrew: "גבורה", x: 0.20, y: 0.39, pillar: "left",   color: [255, 70, 70] },
        { key: "tiferet", name: "Tiferet", title: "Beauty",        hebrew: "תפארת", x: 0.50, y: 0.51, pillar: "middle", color: [255, 212, 95] },
        { key: "netzach", name: "Netzach", title: "Victory",       hebrew: "נצח", x: 0.80, y: 0.65,  pillar: "right",  color: [80, 235, 150] },
        { key: "hod",     name: "Hod",     title: "Splendor",      hebrew: "הוד", x: 0.20, y: 0.65,  pillar: "left",   color: [255, 145, 65] },
        { key: "yesod",   name: "Yesod",   title: "Foundation",    hebrew: "יסוד", x: 0.50, y: 0.79, pillar: "middle", color: [175, 135, 255] },
        { key: "malkuth", name: "Malkuth", title: "Kingdom",       hebrew: "מלכות", x: 0.50, y: 0.945, pillar: "middle", color: [120, 205, 130] }
    ];

    const BY_KEY = {};
    SEPHIROT.forEach(s => { BY_KEY[s.key] = s; });

    // --- The 22 Paths --------------------------------------------------------
    // Each path carries one of the 22 letters of the Hebrew alphabet. Order
    // follows the traditional enumeration of the connecting channels.
    const HEBREW_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת".split("");
    const PATH_PAIRS = [
        ["keter", "chokmah"], ["keter", "binah"], ["keter", "tiferet"],
        ["chokmah", "binah"], ["chokmah", "tiferet"], ["chokmah", "chesed"],
        ["binah", "tiferet"], ["binah", "gevurah"],
        ["chesed", "gevurah"], ["chesed", "tiferet"], ["chesed", "netzach"],
        ["gevurah", "tiferet"], ["gevurah", "hod"],
        ["tiferet", "netzach"], ["tiferet", "hod"], ["tiferet", "yesod"],
        ["netzach", "hod"], ["netzach", "yesod"], ["netzach", "malkuth"],
        ["hod", "yesod"], ["hod", "malkuth"],
        ["yesod", "malkuth"]
    ];
    const PATHS = PATH_PAIRS.map((p, i) => ({
        a: p[0], b: p[1], letter: HEBREW_LETTERS[i] || "", index: i
    }));

    // --- The Lightning Flash -------------------------------------------------
    // The sequence in which divine emanation descends through the vessels.
    const LIGHTNING = [
        "keter", "chokmah", "binah", "chesed", "gevurah",
        "tiferet", "netzach", "hod", "yesod", "malkuth"
    ];

    // --- Organism → Vessel mapping -------------------------------------------
    // Each synthesis organism broadcast by SuperCollider finds its seat on the
    // Tree. Unmapped types settle in Tiferet, the reconciling center.
    const ORGANISM_SEPHIRAH = {
        Proteus: "chokmah",      // the shapeshifter — raw wisdom, the flash
        Relinquished: "gevurah", // sacrifice, severance, the consuming fire
        Golem: "malkuth",        // animated earth, the body of the kingdom
        Typhon: "binah",         // primordial accumulation, the great deep
        AgentSmith: "hod",       // replication & intellect, splendor of form
        Ditto: "netzach",        // mimicry, endurance, the enduring copy
        Subtractive: "gevurah",
        FM: "chokmah",
        Additive: "chesed",
        Wavetable: "tiferet",
        PD: "yesod",
        Physical: "malkuth",
        WestCoast: "netzach",
        Formant: "binah",
        Vector: "tiferet",
        Granular: "yesod"
    };

    // Color identity of each organism (mirrors brahma/web/public/sketch.js
    // legacy palette so live + demo streams render consistently).
    const TYPE_COLORS = {
        Proteus: [0, 255, 255], Relinquished: [255, 0, 0], Golem: [255, 165, 0],
        Typhon: [148, 0, 211], AgentSmith: [0, 255, 0], Ditto: [255, 255, 0],
        Subtractive: [100, 200, 255], FM: [255, 100, 200], Additive: [200, 255, 100],
        Wavetable: [255, 200, 100], PD: [100, 255, 200], Physical: [200, 150, 100],
        WestCoast: [255, 100, 100], Formant: [180, 100, 255], Vector: [100, 180, 255],
        Granular: [220, 220, 220]
    };

    function seatFor(type) { return ORGANISM_SEPHIRAH[type] || "tiferet"; }
    function colorFor(type) { return TYPE_COLORS[type] || [255, 255, 255]; }

    // Resolve a sephirah's screen position inside a given tree bounding box.
    //   box = { cx, top, treeW, treeH }
    function nodePos(s, box) {
        return {
            x: box.cx + (s.x - 0.5) * box.treeW,
            y: box.top + s.y * box.treeH
        };
    }

    return {
        SEPHIROT, BY_KEY, PATHS, LIGHTNING, HEBREW_LETTERS,
        ORGANISM_SEPHIRAH, TYPE_COLORS,
        seatFor, colorFor, nodePos
    };
})();
