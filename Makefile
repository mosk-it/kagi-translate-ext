.PHONY: all firefox chrome clean

DIST_FIREFOX = dist/firefox
DIST_CHROME = dist/chrome
SRC = src

all: firefox chrome

firefox: clean_firefox
	mkdir -p $(DIST_FIREFOX)
	cp $(SRC)/*.html $(DIST_FIREFOX)/
	cp firefox/manifest.json $(DIST_FIREFOX)/manifest.json
	cp icon.png $(DIST_FIREFOX)
	cp ./node_modules/webextension-polyfill/dist/browser-polyfill.js $(DIST_FIREFOX)
	tsc src/*.ts --module es2015 --target es2015 --outDir $(DIST_FIREFOX)
	cd $(DIST_FIREFOX) && zip -r ../firefox-extension.zip *

chrome: clean_chrome
	mkdir -p $(DIST_CHROME)
	cp $(SRC)/*.html $(DIST_CHROME)/
	cp chrome/manifest.json $(DIST_CHROME)/manifest.json
	cp icon.png $(DIST_CHROME)
	cp ./node_modules/webextension-polyfill/dist/browser-polyfill.js $(DIST_FIREFOX)
	tsc src/*.ts --module es2015 --target es2015 --outDir $(DIST_CHROME)
	cd $(DIST_CHROME) && zip -r ../chrome-extension.zip *

clean_firefox:
	rm -rf $(DIST_FIREFOX)
	rm -f firefox-extension.zip

clean_chrome:
	rm -rf $(DIST_CHROME)
	rm -f chrome-extension.zip

clean: clean_firefox clean_chrome
	rm -rf dist


