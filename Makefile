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
#   make demucs    install TRUE separation (htdemucs) for higher-quality rips

.PHONY: help smoke dist serve validate clean rip forge render track demucs

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

demucs:
	bash tools/setup-demucs.sh
