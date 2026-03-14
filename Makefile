.PHONY: build test ci deploy-prod deploy-demo

PROD_ASSETS = index.html manifest.json sw.js icon-192.svg icon-512.svg
DEMO_ASSETS = demo.html manifest.json sw.js icon-192.svg icon-512.svg

build:
	node scripts/build.js

test: build
	node scripts/test.js

ci:
	node scripts/ci.js

deploy-prod: ci
	@echo "\n\033[1mPreparing production deploy…\033[0m"
	rm -rf _site
	mkdir -p _site
	$(foreach f,$(PROD_ASSETS),cp public/$(f) _site/$(f);)
	@echo "\033[32m✓ _site/ ready\033[0m"
	gh api repos/:owner/:repo/pages -X GET > /dev/null 2>&1 || \
		(echo "\033[31m✗ GitHub Pages not configured for this repo\033[0m"; exit 1)
	git stash --include-untracked -q 2>/dev/null; \
	CURRENT=$$(git rev-parse --abbrev-ref HEAD); \
	git checkout --orphan gh-pages-tmp; \
	git rm -rf . > /dev/null 2>&1; \
	cp -r _site/* .; \
	git add .; \
	git commit -m "deploy production from $$(git rev-parse --short HEAD)"; \
	git push origin HEAD:gh-pages --force; \
	git checkout $$CURRENT; \
	git branch -D gh-pages-tmp; \
	git stash pop -q 2>/dev/null || true
	rm -rf _site
	@echo "\033[32m\033[1m✓ Production deployed to gh-pages branch\033[0m"

deploy-demo: ci
	@echo "\n\033[1mPreparing demo deploy…\033[0m"
	rm -rf _demo
	mkdir -p _demo
	cp public/demo.html _demo/index.html
	$(foreach f,$(filter-out demo.html,$(DEMO_ASSETS)),cp public/$(f) _demo/$(f);)
	@echo "\033[32m✓ _demo/ ready\033[0m"
	OWNER=$$(gh api user --jq .login); \
	cd _demo && \
	git init && \
	git checkout -b gh-pages && \
	git add . && \
	git commit -m "deploy demo from $$(cd .. && git rev-parse --short HEAD)" && \
	git push --force git@github.com:$$OWNER/tcg-tracker-demo.git gh-pages
	rm -rf _demo
	@echo "\033[32m\033[1m✓ Demo deployed to tcg-tracker-demo gh-pages branch\033[0m"
