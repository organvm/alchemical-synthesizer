/*
  Phase 14: Per-Stem Modular Render — one stolen stem, one creature.

  Where 13_nrt_renderer bounces a single premix through one voice, THIS renders
  EACH stem of a forge recipe through its OWN creature-voice, then sums them
  under a master limiter — the "supremely powerful modular synth" made literal:

      drums  -> Ossuary   (a resonant percussive relic; DynKlank bones)
      bass   -> Mnemosyne (tape wow/flutter + saturation)
      vocals -> Chrysalid (granular morph)
      melody -> Prima     (clean lead + octave shimmer)   [--other]
      (opt)  -> Janiform  (forward/reverse duality)

  All headless (scsynth -N, no audio device, no GUI). Self-contained by design:
  it defines its own NRT-safe voices and ships them into the offline server via
  \d_recv bundles, so a render never needs the full 317-SynthDef rack to boot.

  The bus topology is the correct modular mixer, in strict node order:
      [head]  \forge_clear   ReplaceOut silence -> private stereo bus (mixBus)
      [mid ]  \forge_<voice> one per stem, Out.ar(mixBus) (they SUM here)
      [tail]  \forge_master  In.ar(mixBus) -> Limiter -> Out.ar(0)
  Private buses are NOT auto-cleared between blocks, so the head clear node is
  what keeps the summing bus from accumulating across blocks.

  Driven from tools/stemforge.py, which reads forge/recipes/<name>/recipe.json,
  picks a voice per stem, normalizes each to stereo 44.1k, and calls:

      Server.program = "/…/scsynth";
      "brahma/sc/14_stem_voices.scd".load;
      ~stem_forge.renderRecipe(
          ["/a/drums.wav", "/b/other.wav"],   // stem paths (stereo 44.1k WAV)
          [\forge_ossuary, \forge_prima],     // voice per stem
          [0.9, 0.85],                        // amp per stem
          "/out/heist.wav", 14.0, true);      // out, duration, exitWhenDone
*/

(
~stem_forge = (

    // ---- the creature-voices: buffer-readers that SUM onto a private bus ----
    // Each returns a (built, un-added) SynthDef so renderRecipe can \d_recv it.
    voices: {
        var d = IdentityDictionary.new;

        // MNEMOSYNE — tape aging (bass / default). Wow+flutter modulate rate,
        // HF erosion + saturation give the worn-tape colour.
        d[\forge_mnemosyne] = SynthDef(\forge_mnemosyne, { |buf = 0, dur = 10, amp = 0.8, out = 2,
                                                           age = 0.4, erosion = 0.25, drive = 0.3|
            var sig, rate, wow, flutter, core, env;
            wow     = LFNoise2.kr(0.5).bipolar(age * 0.05);
            flutter = LFNoise1.kr(10).bipolar(age * 0.02);
            rate    = BufRateScale.kr(buf) * (1 + wow + flutter);
            sig     = PlayBuf.ar(2, buf, rate, loop: 0, doneAction: 2);
            core    = (sig[0] + sig[1]) * 0.5;
            core    = LPF.ar(core, 16000 - (erosion * 13000));
            core    = tanh(core * (1 + (drive * 4)));
            env     = EnvGen.kr(Env.linen(0.05, (dur - 0.3).max(0.1), 0.25));
            Out.ar(out, (core * env * amp) ! 2);
        });

        // OSSUARY MONK — resonant percussive relic (drums). The stem's transients
        // excite a bone/wood/metal resonator bank; blend dry + resonant.
        d[\forge_ossuary] = SynthDef(\forge_ossuary, { |buf = 0, dur = 10, amp = 0.9, out = 2,
                                                       gravity = 0.0, decay = 0.9, blend = 0.4|
            var sig, mono, exc, res, env;
            sig  = PlayBuf.ar(2, buf, BufRateScale.kr(buf), loop: 0, doneAction: 2);
            mono = (sig[0] + sig[1]) * 0.5;
            exc  = HPF.ar(mono, 120) * 0.35;                      // feed transients to the bones
            res  = DynKlank.ar(`[
                [110, 220, 440, 660, 990, 1500] * (1 - (gravity * 0.4)),
                [1, 0.7, 0.5, 0.4, 0.3, 0.2],
                [0.6, 0.5, 0.45, 0.4, 0.35, 0.3] * decay
            ], exc);
            mono = XFade2.ar(mono, LeakDC.ar(res), (blend * 2) - 1);
            env  = EnvGen.kr(Env.linen(0.02, (dur - 0.2).max(0.1), 0.2));
            Out.ar(out, (tanh(mono) * env * amp) ! 2);
        });

        // CHRYSALID SIREN — granular morph (vocals). Grains sweep the buffer with
        // position jitter (identity blur) and optional formant shift.
        d[\forge_chrysalid] = SynthDef(\forge_chrysalid, { |buf = 0, dur = 10, amp = 0.75, out = 2,
                                                           density = 28, blur = 0.08, shift = 0.0|
            var trig, pos, grainDur, pitch, sig, env;
            trig     = Impulse.kr(density);
            pos      = Phasor.ar(1, BufRateScale.kr(buf) / BufFrames.kr(buf), 0, 1);
            pos      = (pos + LFNoise1.kr(8).bipolar(blur)).wrap(0, 1);
            pitch    = 2 ** (shift / 12);
            grainDur = 1.4 / density;
            sig      = GrainBuf.ar(2, trig, grainDur, buf, pitch, pos, 2);
            env      = EnvGen.kr(Env.linen(0.1, (dur - 0.4).max(0.1), 0.3));
            Out.ar(out, sig * env * amp);
        });

        // PRIMA — clean lead + octave shimmer (melody / --other). Keeps the stolen
        // melody legible; adds a quiet octave-up sparkle and gentle warmth.
        d[\forge_prima] = SynthDef(\forge_prima, { |buf = 0, dur = 10, amp = 0.85, out = 2,
                                                   shimmer = 0.2, warmth = 0.25|
            var sig, core, oct, env;
            sig  = PlayBuf.ar(2, buf, BufRateScale.kr(buf), loop: 0, doneAction: 2);
            core = LPF.ar(sig, 17000);
            oct  = PitchShift.ar(core, 0.2, 2.0, 0, 0.01) * shimmer;
            core = core + oct;
            core = XFade2.ar(core, tanh(core * 1.5), (warmth * 2) - 1);
            env  = EnvGen.kr(Env.linen(0.05, (dur - 0.3).max(0.1), 0.25));
            Out.ar(out, core * env * amp);
        });

        // JANIFORM CHILD — forward/reverse duality (optional; bold on melodic stems).
        d[\forge_janiform] = SynthDef(\forge_janiform, { |buf = 0, dur = 10, amp = 0.8, out = 2,
                                                         symmetry = 0.5|
            var frames, ph, fwd, rev, sig, env;
            frames = BufFrames.kr(buf);
            ph     = Phasor.ar(1, BufRateScale.kr(buf), 0, frames);
            fwd    = BufRd.ar(2, buf, ph, loop: 0);
            rev    = BufRd.ar(2, buf, (frames - 1 - ph).max(0), loop: 0);
            sig    = XFade2.ar(fwd, rev, (symmetry * 2) - 1);
            env    = EnvGen.kr(Env.linen(0.05, (dur - 0.3).max(0.1), 0.25));
            Out.ar(out, sig * env * amp);
        });

        // CLEAR — head node: zero the private mix bus every block so the voices
        // sum cleanly onto it (private buses are not auto-cleared).
        d[\forge_clear] = SynthDef(\forge_clear, { |bus = 2|
            ReplaceOut.ar(bus, Silent.ar(2));
        });

        // MASTER — tail node: read the summed mix bus, brickwall it, send to out.
        d[\forge_master] = SynthDef(\forge_master, { |in = 2, out = 0, ceiling = 0.95|
            Out.ar(out, Limiter.ar(LeakDC.ar(In.ar(in, 2)), ceiling, 0.01));
        });

        d;
    },

    // stemPaths   : Array of stereo 44.1k WAV paths (one per stem)
    // voiceNames  : Array of \forge_* symbols (one per stem)
    // amps        : Array of floats (one per stem)
    // outputPath  : destination WAV
    // duration    : render length in seconds
    // exitWhenDone: 0.exit when finished (headless sclang)
    renderRecipe: { |self, stemPaths, voiceNames, amps, outputPath, duration = 12.0, exitWhenDone = false|
        var defs, used, msgs, score, opts, osc, mixBus = 2;

        defs = self.voices.();
        osc  = outputPath ++ ".osc";

        // Ship every distinct voice we use, plus the clear + master infrastructure.
        used = (voiceNames ++ [\forge_clear, \forge_master]).as(Set).asArray;
        msgs = used.collect { |vn| [0.0, [\d_recv, defs[vn].asBytes]] };

        // Load one buffer per stem.
        stemPaths.do { |p, i| msgs = msgs.add([0.0, [\b_allocRead, i, p, 0, 0]]); };

        // Head: clear the mix bus. addToTail (1) of root group (0) preserves the
        // insertion order below -> clear runs first, voices next, master last.
        msgs = msgs.add([0.0, [\s_new, \forge_clear, 900, 1, 0, \bus, mixBus]]);

        // Mid: one voice per stem, each summing onto the mix bus.
        stemPaths.do { |p, i|
            msgs = msgs.add([0.0, [\s_new, voiceNames[i], 1000 + i, 1, 0,
                \buf, i, \dur, duration, \amp, amps[i], \out, mixBus]]);
        };

        // Tail: master limiter -> hardware out.
        msgs = msgs.add([0.0, [\s_new, \forge_master, 2000, 1, 0, \in, mixBus, \out, 0]]);

        // Tail marker so the score runs the full length.
        msgs = msgs.add([duration + 0.5, [\c_set, 0, 0]]);

        score = Score(msgs);

        opts = ServerOptions.new
            .numOutputBusChannels_(2)
            .numInputBusChannels_(0)
            .sampleRate_(44100);

        ("NRT stem render: " ++ stemPaths.size ++ " stem(s) -> " ++ outputPath
            ++ " (" ++ duration ++ "s)").postln;
        stemPaths.do { |p, i| ("  " ++ voiceNames[i] ++ "  <-  " ++ p).postln; };

        score.recordNRT(
            oscFilePath: osc,
            outputFilePath: outputPath,
            sampleRate: 44100,
            headerFormat: "WAV",
            sampleFormat: "int16",
            options: opts,
            duration: duration + 0.6,
            action: {
                ("NRT stem render complete -> " ++ outputPath).postln;
                if(exitWhenDone) { 0.exit(0) };
            }
        );
        outputPath
    }
);

"--- BRAHMA: Stem Voices Loaded (per-stem modular bounce ready) ---".postln;
)
