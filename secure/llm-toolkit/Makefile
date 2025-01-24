version := 0.1.36

# For determinism in torch processes
export CUBLAS_WORKSPACE_CONFIG := :4096:8

.PHONY: default clean dist format format-fix fix install lint lint-fix test all help bump-patch bump-minor bump-major bump-release bump-build
.PHONY: data-load data-process train train-embedding train-classifiers eval eval-figures predict-classifiers all-data-train generate-exclusion-list

default: help

all: clean install lint test dist ## Run all the steps

clean: ## Clean the project
	rm -rf dist

dist: ## Build the package
	poetry build

test:  ## Run tests
	poetry run pytest -sv

integ:  ## Run integration tests
	poetry run pytest -m integration --integration

format:
	poetry run ruff format --check

format-fix:
	poetry run ruff format

fix: lint-fix format-fix ## Fix all issues

install: ## Install all dependencies
	poetry install -E eval -E infer -E torch

install-infer: ## Install inference dependencies
	poetry install -E infer

run-cache: ## Run the cache workflow cache logic
	poetry run python ./scripts/langkit_cache.py

lint: ## Check for type issues with pyright
	@{ echo "Running pyright\n"; poetry run pyright; PYRIGHT_EXIT_CODE=$$?; } ; \
	{ echo "\nRunning ruff check\n"; poetry run ruff check; RUFF_EXIT_CODE=$$?; } ; \
	exit $$(($$PYRIGHT_EXIT_CODE + $$RUFF_EXIT_CODE))
	@# check for type: ignores
	./scripts/bans.sh

lint-fix: ## Fix lint issues with ruff
	poetry run ruff check --fix

bump-patch: ## Bump the patch version (_._.X) everywhere it appears in the project
	@$(call i, Bumping the patch number)
	poetry run bumpversion patch --allow-dirty

bump-minor: ## Bump the minor version (_.X._) everywhere it appears in the project
	@$(call i, Bumping the minor number)
	poetry run bumpversion minor --allow-dirty

bump-major: ## Bump the major version (X._._) everywhere it appears in the project
	@$(call i, Bumping the major number)
	poetry run bumpversion major --allow-dirty

bump-release: ## Convert the version into a release variant (_._._) everywhere it appears in the project
	@$(call i, Removing the dev build suffix)
	poetry run bumpversion release --allow-dirty

bump-build: ## Bump the build number (_._._-____XX) everywhere it appears in the project
	@$(call i, Bumping the build number)
	poetry run bumpversion build --allow-dirty

set-version: ## Set the version to a specific value. Usage: make set-version VERSION=X.Y.Z
	@$(call i, Setting version to $(VERSION))
	poetry run bumpversion --new-version $(VERSION) --allow-dirty patch


# Data/Model creation targets

all-data-train: data-load data-process train eval

## Use the data loading classes to populate the data/ directory.
data-load:  ## Load the raw data stores and store them locally in the git lfs directory
	poetry run python -m whylabs_llm_toolkit.data.datasets.full_datasets.load

generate-exclusion-list: ## Generate the exclusion list for the data
	poetry run python -m whylabs_llm_toolkit.data.scripts.generate_exclusion_list

.PHONY: ./data
./data: data-load generate-exclusion-list  ## Populate the ./data dir from all data sources

## Use the data directory to generate the fully pre processed data artifact. This is what we
## use to train on.
data-process: ## Process raw data stores, generating associated metadata like embeddings and ids
	poetry run python -m whylabs_llm_toolkit.data.scripts.data_pipeline

train: train-embedding train-classifiers ## Train the embedding and classification models. Supply a name with NAME=foo.

train-embedding: ## Train the embedding models. Supply a name with NAME=foo.
	poetry run python -m whylabs_llm_toolkit.data.scripts.train --embedding

train-classifiers: ## Train the classification models. Supply a name with NAME=foo.
	poetry run python -m whylabs_llm_toolkit.data.scripts.train --classifier

train-classifiers-only: ## Train the classification models using the base sentence transformer. Supply a name with NAME=foo.
	poetry run python -m whylabs_llm_toolkit.data.scripts.train --classifier --skip-fine-tuning

train-chroma: ## Create the chroma db
	poetry run python -m whylabs_llm_toolkit.data.scripts.training.train_chroma

train-chroma-twoclass:
	poetry run python -m whylabs_llm_toolkit.data.scripts.training.train_chroma_twoclass

predict-classifiers: ## Load a python repl with a predict() method for the classification models
	poetry run ipython -i -m whylabs_llm_toolkit.data.scripts.predict

eval: eval-figures ## Generate evaluation plots and stats

eval-figures:  ## Generate evaluation figures for the classifiers. The NAME=foo arg determines which model is used.
	poetry run python -m whylabs_llm_toolkit.data.scripts.eval

upload: ## Upload training artifacts to songbird
	poetry run python -m whylabs_llm_toolkit.data.scripts.upload

benchmark: ## Run the benchmarking script for available langkit metrics.
	poetry run python -m whylabs_llm_toolkit.data.scripts.benchmark

competition-compare:
	poetry run python -m whylabs_llm_toolkit.data.scripts.competition_comparison

benchmark-report:
	poetry run python -m whylabs_llm_toolkit.data.scripts.benchmark_report

hf-push: ## Push Data to Hugging Face for Dataset Curation Space
	poetry run python -m whylabs_llm_toolkit.data.scripts.hf_push


# CI related stuff

gitlab-ci-image-build:
	docker build . -f Dockerfile.build -t registry.gitlab.com/whylabs/datascience/whylabs-llm-toolkit/ci-training

gitlab-ci-image-push:
	docker push registry.gitlab.com/whylabs/datascience/whylabs-llm-toolkit/ci-training

help: ## Show this help message.
	@echo 'usage: make [target] ...'
	@echo
	@echo 'targets:'
	@egrep '^(.+)\:(.*) ##\ (.+)' ${MAKEFILE_LIST} | sed -s 's/:\(.*\)##/: ##/' | column -t -c 2 -s ':#'
