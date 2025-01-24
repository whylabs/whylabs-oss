.PHONY: help test lint lint-fix format format-fix fix clean all default

default: help

run:
	poetry run python -m data_merger.main

lint: ## Check for type issues with pyright
	@{ echo "Running pyright\n"; poetry run pyright; PYRIGHT_EXIT_CODE=$$?; } ; \
	{ echo "\nRunning ruff check\n"; poetry run ruff check; RUFF_EXIT_CODE=$$?; } ; \
	{ echo "\nRunning docsub check\n"; poetry run python -m scripts.docsub --check; DOCSUB_EXIT_CODE=$$?; } ; \
	{ echo "\nRunning ban checks\n"; ./scripts/bans.sh; BANS_EXIT_CODE=$$?; } ; \
	exit $$(($$PYRIGHT_EXIT_CODE + $$RUFF_EXIT_CODE + $$DOCSUB_EXIT_CODE + $$BANS_EXIT_CODE))

lint-fix: ## Fix type issues with pyright
	poetry run ruff check --fix

format: ## Check for formatting issues
	poetry run ruff format --check

format-fix: ## Fix formatting issues
	poetry run ruff format

fix: lint-fix format-fix ## Fix all linting and formatting issues

help: ## Show this help message.
	@echo 'usage: make [target] ...'
	@echo
	@echo 'targets:'
	@egrep '^(.+)\:(.*) ##\ (.+)' ${MAKEFILE_LIST} | sed -s 's/:\(.*\)##/: ##/' | column -t -c 2 -s ':#'

