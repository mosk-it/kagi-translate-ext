.PHONY: all firefox chrome clean

DIST_FIREFOX = dist/firefox
DIST_CHROME = dist/chrome
MANIFEST_FIREFOX = manifest/firefox-manifest.json
MANIFEST_CHROME = manifest/chrome-manifest.json
SRC = src

DOCKER_BUILDER_IMG = kt-webext-builder

all: firefox chrome



firefox_esm: clean_firefox
	mkdir -p $(DIST_FIREFOX)
	cp $(SRC)/*.html $(DIST_FIREFOX)/
	cp $(MANIFEST_FIREFOX) $(DIST_FIREFOX)/manifest.json
	cp images/icon.png $(DIST_FIREFOX)
	npm install

	cp ./src/styles.css $(DIST_FIREFOX)
	./node_modules/.bin/esbuild src/content-script.ts \
		--bundle \
		--target=es2015 \
		--outfile=$(DIST_FIREFOX)/content-script.js \
		--minify \
		--format=iife

	./node_modules/.bin/esbuild src/options.ts src/popup.ts src/background.ts \
		--bundle \
		--target=es2015 \
		--outdir=$(DIST_FIREFOX) \
		--splitting \
		--tree-shaking \
		--minify \
		--format=esm

	cd $(DIST_FIREFOX) && zip -r ../firefox-extension.zip *



chrome_esm: clean_chrome
	mkdir -p $(DIST_CHROME)
	cp $(SRC)/*.html $(DIST_CHROME)/
	cp $(MANIFEST_CHROME) $(DIST_CHROME)/manifest.json
	cp images/icon.png $(DIST_CHROME)
	npm install
	cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js $(DIST_CHROME)

	cp ./src/styles.css $(DIST_CHROME)
	./node_modules/.bin/esbuild src/content-script.ts \
		--bundle \
		--target=es2015 \
		--outfile=$(DIST_CHROME)/content-script.js \
		--minify \
		--format=iife

	./node_modules/.bin/esbuild src/options.ts src/popup.ts src/background.ts \
		--bundle \
		--target=es2015 \
		--outdir=$(DIST_CHROME) \
		--splitting \
		--tree-shaking \
		--minify \
		--format=esm

	cd $(DIST_CHROME) && zip -r ../chrome-extension.zip *




firefox: clean_firefox
	mkdir -p $(DIST_FIREFOX)
	cp $(SRC)/*.html $(DIST_FIREFOX)/
	cp $(MANIFEST_FIREFOX) $(DIST_FIREFOX)/manifest.json
	cp images/icon.png $(DIST_FIREFOX)
	npm install
	cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js $(DIST_FIREFOX)
	./node_modules/.bin/esbuild src/options.ts src/popup.ts --bundle --minify --target=es2015 --outdir=$(DIST_FIREFOX)
	./node_modules/.bin/esbuild src/background.ts --minify --target=es2015 --outdir=$(DIST_FIREFOX)
	./node_modules/.bin/esbuild src/content-script.ts --minify --target=es2015 --outdir=$(DIST_FIREFOX)
 
	cd $(DIST_FIREFOX) && zip -r ../firefox-extension.zip *
	#rm -rf $(DIST_FIREFOX)

chrome: clean_chrome
	mkdir -p $(DIST_CHROME)
	cp $(SRC)/*.html $(DIST_CHROME)/
	cp $(MANIFEST_CHROME) $(DIST_CHROME)/manifest.json
	cp images/icon.png $(DIST_CHROME)
	npm install
	cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js $(DIST_CHROME)
	./node_modules/.bin/esbuild src/options.ts src/popup.ts --bundle --minify --target=es2015 --outdir=$(DIST_CHROME)
	./node_modules/.bin/esbuild src/background.ts --minify --target=es2015 --outdir=$(DIST_CHROME)
	./node_modules/.bin/esbuild src/content-script.ts --minify --target=es2015 --outdir=$(DIST_CHROME)
	cd $(DIST_CHROME) && zip -r ../chrome-extension.zip *
	#rm -rf $(DIST_CHROME)


docker_build: 
	docker build -t $(DOCKER_BUILDER_IMG) .

docker_firefox: docker_build
	docker run --rm -v $(PWD)/dist:/app/dist $(DOCKER_BUILDER_IMG) make firefox

docker_chrome: docker_build
	docker run --rm -v $(PWD)/dist:/app/dist $(DOCKER_BUILDER_IMG) make chrome

docker_all: docker_build
	docker run --rm -v $(PWD)/dist:/app/dist $(DOCKER_BUILDER_IMG) make


get_langs_from_kagi:
	python ./local/tools/get_langs_from_kagi_translate.py


clean_docker:
	docker rmi -f $(DOCKER_BUILDER_IMG)

clean_firefox:
	rm -rf $(DIST_FIREFOX)
	rm -f firefox-extension.zip

clean_chrome:
	rm -rf $(DIST_CHROME)
	rm -f chrome-extension.zip

clean: clean_firefox clean_chrome clean_docker
	# rm -rf dist/*
