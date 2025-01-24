init:
	git config core.hooksPath .githooks

.PHONY: release build dev format lint test integration clean docker run-docker publish

release: format lint build test ## For building everything and running all pre build checks

build: ## For building everything
	./gradlew build distTar

dev:  ## For running a minimal build or a continuous/watch build if possible
	./gradlew develop --continuous

format: ## Run the style formatter
	./gradlew ktlintCheck

format-fix: ## Run the style format fix
	./gradlew ktlintFormat

lint: format ## Run the linter

test:  ## For running the unit tests
	./gradlew test

integration: ## For running integration tests
	./gradlew test -PintegTests=true

clean: ## For removing all build artifacts
	./gradlew clean
	rm -rf generated

docker: ## For building the docker image
	docker build -t "songbird:latest"

run-docker:  ## For running the docker application locally
	docker run  songbird:latest

publish:  ## For publishing code to remote repositories
	# TODO

help: ## Show this help message.
	@echo 'usage: make [target] ...'
	@echo
	@echo 'targets:'
	@egrep '^(.+)\:\ ##\ (.+)' ${MAKEFILE_LIST} | column -t -c 2 -s ':#'
