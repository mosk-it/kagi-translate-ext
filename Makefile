.PHONY: all firefox chrome clean

DIST_FIREFOX = dist/firefox
DIST_CHROME = dist/chrome
MANIFEST_FIREFOX = manifest/firefox-manifest.json
MANIFEST_CHROME = manifest/chrome-manifest.json
SRC = src

all: firefox chrome

firefox: clean_firefox
	mkdir -p $(DIST_FIREFOX)
	cp $(SRC)/*.html $(DIST_FIREFOX)/
	cp $(MANIFEST_FIREFOX) $(DIST_FIREFOX)/manifest.json
	cp icon.png $(DIST_FIREFOX)
	npm install
	./node_modules/.bin/esbuild src/options.ts src/popup.ts --bundle --minify --target=es2015 --outdir=$(DIST_FIREFOX)
	cd $(DIST_FIREFOX) && zip -r ../firefox-extension.zip *

chrome: clean_chrome
	mkdir -p $(DIST_CHROME)
	cp $(SRC)/*.html $(DIST_CHROME)/
	cp $(MANIFEST_CHROME) $(DIST_CHROME)/manifest.json
	cp icon.png $(DIST_CHROME)
	npm install
	cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js $(DIST_CHROME)
	./node_modules/.bin/esbuild src/options.ts src/popup.ts --bundle --minify --target=es2015 --outdir=$(DIST_CHROME)
	cd $(DIST_CHROME) && zip -r ../chrome-extension.zip *

clean_firefox:
	rm -rf $(DIST_FIREFOX)
	rm -f firefox-extension.zip

clean_chrome:
	rm -rf $(DIST_CHROME)
	rm -f chrome-extension.zip

clean: clean_firefox clean_chrome
	rm -rf dist/*
