/*
  Phase 29: ABLETON BRIDGE — Live Set Absorption

  Receives OSC from the "Brahma Bridge" Ableton Live Extension
  (brahma/ableton/) and re-expresses the active Live Set as a donor
  identity inside the Meta-Rack:

    - /ableton/transport     -> drives CHRONOS tempo (+ Link if active)
    - /ableton/set/structure -> registers/updates the "Ableton" organism
                                 (entity 1003) via AdamKadmon
    - /ableton/track         -> per-track state (logged / coherence hints)
    - /ableton/organism/update -> coherence + entropy from the extension
    - /ableton/absorb        -> begin wearing the Set
    - /ableton/release       -> shed the Set

  OSC contract matches brahma/ableton/src/mapper.js. The extension sends to
  127.0.0.1:57120 (the same port PD and the Visual Cortex use to reach SC).
*/

(
~ableton_bridge = (
    entityId: 1003,
    type: "Ableton",
    worn: false,
    setName: "(none)",
    coherence: 0.3,
    entropy: 0.0,
    lastUpdate: 0,

    // Latest structure snapshot from /ableton/set/structure
    numTracks: 0, numAudio: 0, numMidi: 0, numScenes: 0, numDevices: 0, numClips: 0,
    transport: (playing: false, tempo: 120.0, songTime: 0.0, loop: false),

    // Build a normalised AdamKadmon trait map from the current snapshot.
    // Mirrors the heuristics in mapper.js so SC and the extension agree.
    deriveTraitMap: { |self|
        var tempoUnit = ((self[\transport][\tempo] - 20) / 280).clip(0, 1);
        var balance = if(self[\numTracks] > 0, { self[\numMidi] / self[\numTracks] }, { 0 });
        var diversity = (1 - ((0.5 - balance).abs * 2)).clip(0, 1);
        (
            spectral_profile: (
                centroid: tempoUnit,
                flatness: diversity,
                bandwidth: (self[\numDevices] / 32).clip(0, 1),
                rolloff: (self[\numClips] / 64).clip(0, 1)
            ),
            temporal_topology: (
                attack: (1 - tempoUnit).clip(0, 1),
                decay: (self[\numScenes] / 16).clip(0, 1),
                sustain: self[\coherence].clip(0, 1),
                release: if(self[\transport][\loop], 0.8, 0.3),
                slew: 0.5
            ),
            modulation_graph: (
                type: \ableton, sources: self[\numTracks],
                dests: self[\numDevices], routes: self[\numClips]
            ),
            performance_response: (
                velocity: 0.8, aftertouch: 0.5,
                xy_sensitivity: (self[\numTracks] / 32).clip(0, 1),
                humanize: if(self[\transport][\playing], 0.6, 0.1)
            )
        );
    },

    // Register/update the Ableton organism in the global registry.
    integrate: { |self|
        var traits = self.deriveTraitMap;
        // Honour the Trait Validation invariant before integrating.
        if(AdamKadmon.validateTraitMap(traits)) {
            traits = AdamKadmon.normalize(traits);
            ~brahma_registry.registerEntity(self[\entityId], self[\type], traits);
            self[\worn] = true;
        } {
            "ABLETON BRIDGE: trait map failed validation — not integrated".warn;
        };
    },

    // Push the organism state to the Visual Cortex (if present).
    broadcast: { |self|
        if(~visual_cortex.notNil) {
            ~visual_cortex.broadcastUpdate(
                self[\entityId], self[\type], self[\coherence], self[\entropy]
            );
        };
    },

    status: { |self|
        "ABLETON BRIDGE STATUS:".postln;
        "  worn: %  set: %".format(self[\worn], self[\setName]).postln;
        "  transport: playing=% tempo=% loop=%".format(
            self[\transport][\playing], self[\transport][\tempo], self[\transport][\loop]).postln;
        "  structure: % tracks (% audio / % midi), % scenes, % devices, % clips".format(
            self[\numTracks], self[\numAudio], self[\numMidi],
            self[\numScenes], self[\numDevices], self[\numClips]).postln;
        "  coherence: %  entropy: %".format(self[\coherence], self[\entropy]).postln;
    }
);

// ==========================================
// OSC RESPONDERS
// ==========================================

// /ableton/absorb [setName:str] — begin wearing the Live Set
OSCdef(\ableton_absorb, { |msg|
    ~ableton_bridge[\setName] = (msg[1] ? "Live Set").asString;
    "ABLETON BRIDGE: absorbing '%'".format(~ableton_bridge[\setName]).postln;
}, "/ableton/absorb");

// /ableton/release — shed the Set
OSCdef(\ableton_release, { |msg|
    ~ableton_bridge[\worn] = false;
    "ABLETON BRIDGE: released '%'".format(~ableton_bridge[\setName]).postln;
}, "/ableton/release");

// /ableton/transport [playing:int] [tempo:float] [songTime:float] [loop:int]
OSCdef(\ableton_transport, { |msg|
    var playing = (msg[1] ? 0).asInteger > 0;
    var tempo = (msg[2] ? 120).asFloat;
    var songTime = (msg[3] ? 0).asFloat;
    var loop = (msg[4] ? 0).asInteger > 0;

    ~ableton_bridge[\transport] = (playing: playing, tempo: tempo, songTime: songTime, loop: loop);

    // Drive CHRONOS tempo
    if(~chronos.notNil and: { tempo > 0 }) {
        ~chronos[\tempo] = tempo;
    };
    // Mirror into Ableton Link if the SCRIPTORIUM sync clock is running
    if(~scriptorium_sync.notNil and: { ~scriptorium_sync[\linkClock].notNil }) {
        ~scriptorium_sync[\linkClock].tempo = tempo / 60;
    };
}, "/ableton/transport");

// /ableton/set/structure [tracks] [audio] [midi] [scenes] [devices] [clips]
OSCdef(\ableton_structure, { |msg|
    ~ableton_bridge[\numTracks]  = (msg[1] ? 0).asInteger;
    ~ableton_bridge[\numAudio]   = (msg[2] ? 0).asInteger;
    ~ableton_bridge[\numMidi]    = (msg[3] ? 0).asInteger;
    ~ableton_bridge[\numScenes]  = (msg[4] ? 0).asInteger;
    ~ableton_bridge[\numDevices] = (msg[5] ? 0).asInteger;
    ~ableton_bridge[\numClips]   = (msg[6] ? 0).asInteger;
    ~ableton_bridge.integrate;
}, "/ableton/set/structure");

// /ableton/track [index] [name] [muted] [soloed] [armed] [numClips] [color]
// Currently informational; kept for future per-track routing.
OSCdef(\ableton_track, { |msg| /* reserved */ }, "/ableton/track");

// /ableton/organism/update [id] [type] [coherence] [entropy]
OSCdef(\ableton_organism_update, { |msg|
    ~ableton_bridge[\coherence] = (msg[3] ? 0.3).asFloat;
    ~ableton_bridge[\entropy]   = (msg[4] ? 0.0).asFloat;
    ~ableton_bridge[\lastUpdate] = Main.elapsedTime;
    ~ableton_bridge.broadcast;
}, "/ableton/organism/update");

// /ableton/status — print bridge state
OSCdef(\ableton_status, { ~ableton_bridge.status }, "/ableton/status");

"--- BRAHMA: ABLETON BRIDGE Online (Live Set absorption @ 57120) ---".postln;
)
