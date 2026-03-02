build-BasicFunction:
	npm ci
	npm run build
	cp -r dist/* $(ARTIFACTS_DIR)/
	cp package.json $(ARTIFACTS_DIR)/
