# Alchemical Synthesizer (Brahma Meta-Rack) — root-to-leaf entry points.
#
#   make smoke     run the user smoke test (structure, extension, validator, web)
#   make dist      build distributable artifacts into dist/
#   make serve     install web deps and launch the Visual Cortex (port 3000)
#   make validate  validate an audio specimen:  make validate FILE=path/to.wav
#   make clean     remove build output and installed web deps

.PHONY: help smoke dist serve validate clean

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
