default: build

.PHONY: init clean build tar bundle lint lint-fix

init:
	git config core.hooksPath .githooks

clean:
	./gradlew clean

build:
	./gradlew build

tar: # create a distribution tar
	./gradlew --build-cache tgz

bundle:
	./gradlew --build-cache :murmuration-bundle:build

lint: # check for code style
	./gradlew spotlessCheck -q

lint-fix: # fix code style
	./gradlew spotlessApply

conda-env:
	conda create -f --name whylabs-process-core --file python/conda-osx-64.lock

pyenv-osx:
	(cd python; poetry install --no-root)

py-install:
	poetry install

requirements-txt:
	@$(call i, Installing Poetry)
	(cd python; poetry export -f requirements.txt --without-hashes) | fgrep -v pmdarima > requirements.txt

docker-x86:
	(cd python; docker build -f x86_64.Dockerfile -t murmuration:x864 .)

docker-aarch64:
	(cd python; docker buildx build --platform linux/arm64 -f aarch64.Dockerfile -t murmuration:aarch64 . --load)

test:
	./gradlew check
