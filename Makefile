NPM := npm
FILES := .

.PHONY: dev build preview clean format lint check

dev: node_modules
	$(NPM) run dev

build: node_modules
	$(NPM) run build

preview: build
	$(NPM) run preview

clean:
	rm -rf .svelte-kit build node_modules

format:
	npx prettier --write "$(FILES)" --plugin-search-dir=.

lint: node_modules
	$(NPM) run lint

check: node_modules
	npx prettier --check "$(FILES)" --plugin-search-dir=.
	$(NPM) run lint
	$(NPM) run check

node_modules: package.json package-lock.json
	$(NPM) ci
	@touch node_modules
