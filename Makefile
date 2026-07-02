# Alchemical Synthesizer (Brahma Meta-Rack) — root-to-leaf entry points.
#
#   make smoke     run the user smoke test (structure, extension, validator, web)
#   make dist      build distributable artifacts into dist/
#   make serve     install web deps and launch the Visual Cortex (port 3000)
#   make validate  validate an audio specimen:  make validate FILE=path/to.wav
#   make clean     remove build output and installed web deps
#
#   -- The Forge: sample -> track pipeline --
#   make rip       rip a song into stems:        make rip SONG=song.mp3 [NAME=song]
#   make forge     recombine stolen stems:        make forge NAME=heist DRUMS=a/drums.wav MELODY=b/other.wav
#   make render    Brahma re-expresses a WAV:      make render SONG=in.wav OUT=out.wav [DUR=12]
#   make track     stems -> re-expressed track:    make track NAME=heist DRUMS=a/drums.wav MELODY=b/other.wav OUT=out/heist.wav [DUR=12]
#   make stemtrack per-stem modular render:         make stemtrack NAME=heist DRUMS=a/drums.wav MELODY=b/other.wav OUT=out/heist.wav [MAP=drums=ossuary,other=janiform] [DUR=12]
#   make videotrack track -> matching visual clip:  make videotrack TRACK=out/heist.wav [OUT=out/heist.mp4] [FPS=30] [WIDTH=1080] [HEIGHT=1080] [SUBSTRATE=sound]
#   make package   track -> social-ready bundle:     make package TRACK=out/heist.wav [TITLE="Heist"] [LINK=https://...] [SUBSTRATE=sound]
#   make demucs    install TRUE separation (htdemucs) for higher-quality rips
#   make video     install headless video export (puppeteer) for videotrack

.PHONY: help smoke dist serve validate clean rip forge render track stemtrack videotrack package demucs video

help:
	@grep -E '^#   make ' Makefile | sed 's/^#   /  /'

smoke:
	bash tools/smoke.sh

dist:
	bash tools/build_release.sh

serve:
	cd brahma/web && npm install && npm start

validate:
	@test -n "$(FILE)" || { echo "usage: make validate FILE=path/to.wav"; exit 1; }
	python3 tools/validate_audio.py "$(FILE)"

clean:
	rm -rf dist brahma/web/node_modules

# ---- The Forge: sample -> track pipeline ----

rip:
	@test -n "$(SONG)" || { echo "usage: make rip SONG=song.mp3 [NAME=song]"; exit 1; }
	python3 tools/rip.py "$(SONG)" $(if $(NAME),--name $(NAME),)

forge:
	@test -n "$(NAME)" && test -n "$(DRUMS)" && test -n "$(MELODY)" || \
		{ echo "usage: make forge NAME=x DRUMS=a/drums.wav MELODY=b/other.wav [BASS=..] [VOCALS=..]"; exit 1; }
	bash tools/forge.sh --name $(NAME) --drums "$(DRUMS)" --melody "$(MELODY)" \
		$(if $(BASS),--bass "$(BASS)",) $(if $(VOCALS),--vocals "$(VOCALS)",) --mix

render:
	@test -n "$(SONG)" && test -n "$(OUT)" || { echo "usage: make render SONG=in.wav OUT=out.wav [DUR=12]"; exit 1; }
	bash tools/bounce.sh "$(SONG)" "$(OUT)" $(DUR)

track:
	@test -n "$(NAME)" && test -n "$(DRUMS)" && test -n "$(MELODY)" && test -n "$(OUT)" || \
		{ echo "usage: make track NAME=x DRUMS=a/drums.wav MELODY=b/other.wav OUT=out/x.wav [DUR=12]"; exit 1; }
	bash tools/forge.sh --name $(NAME) --drums "$(DRUMS)" --melody "$(MELODY)" --mix
	bash tools/bounce.sh forge/recipes/$(NAME)/premix.wav "$(OUT)" $(DUR)

# stemtrack: like track, but render EACH stem through its own creature-voice and
# sum under a master limiter (drums->ossuary, bass->mnemosyne, vocals->chrysalid,
# melody->prima). No premix — the modular path. --map/DUR are optional.
stemtrack:
	@test -n "$(NAME)" && test -n "$(DRUMS)" && test -n "$(MELODY)" && test -n "$(OUT)" || \
		{ echo "usage: make stemtrack NAME=x DRUMS=a/drums.wav MELODY=b/other.wav OUT=out/x.wav [BASS=..] [VOCALS=..] [MAP=drums=ossuary] [DUR=12]"; exit 1; }
	bash tools/forge.sh --name $(NAME) --drums "$(DRUMS)" --melody "$(MELODY)" \
		$(if $(BASS),--bass "$(BASS)",) $(if $(VOCALS),--vocals "$(VOCALS)",)
	python3 tools/stemforge.py $(NAME) --out "$(OUT)" $(if $(DUR),--dur $(DUR),) $(if $(MAP),--map $(MAP),)

demucs:
	bash tools/setup-demucs.sh

# videotrack: a rendered track -> a matching audio-reactive video. Analyzes the
# audio into a per-frame envelope, drives the Etz Chaim cosmos headlessly, and
# muxes frames + audio into a post-ready mp4. Needs `make video` first.
videotrack:
	@test -n "$(TRACK)" || { echo "usage: make videotrack TRACK=out/heist.wav [OUT=out/heist.mp4] [FPS=30] [WIDTH=1080] [HEIGHT=1080] [SUBSTRATE=sound]"; exit 1; }
	bash tools/videotrack.sh --track "$(TRACK)" \
		$(if $(OUT),--out "$(OUT)",) $(if $(FPS),--fps $(FPS),) \
		$(if $(WIDTH),--width $(WIDTH),) $(if $(HEIGHT),--height $(HEIGHT),) \
		$(if $(SUBSTRATE),--substrate $(SUBSTRATE),)

video:
	bash tools/setup-video.sh

# package: a rendered track -> a social-ready bundle (video + cover + caption) in
# out/pkg/<base>/. Burns a "made with Brahma" mark into the clip and picks the
# peak-energy frame as the cover. Set BRAHMA_LINK to bake your funnel URL in.
package:
	@test -n "$(TRACK)" || { echo "usage: make package TRACK=out/heist.wav [TITLE=\"Heist\"] [LINK=https://...] [SUBSTRATE=sound]"; exit 1; }
	bash tools/package.sh --track "$(TRACK)" \
		$(if $(TITLE),--title "$(TITLE)",) $(if $(LINK),--link "$(LINK)",) \
		$(if $(SUBSTRATE),--substrate $(SUBSTRATE),) $(if $(FPS),--fps $(FPS),)
