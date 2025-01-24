import logging
import os
from typing import List

import pytest

logging.basicConfig(level=logging.INFO)
os.environ["TOKENIZERS_PARALLELISM"] = "true"
os.environ["DEFAULT_ASSET_STAGE"] = "dev"


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption("--load", action="store_true", default=False, help="run load tests")
    parser.addoption("--integration", action="store_true", default=False, help="run integration tests")


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line("markers", "load: mark test as load to skip running with unit tests")
    config.addinivalue_line("markers", "integration: mark test as integration to skip running with unit tests")


def pytest_collection_modifyitems(config: pytest.Config, items: List[pytest.Item]) -> None:
    if config.getoption("--load"):
        # --integ specified on command line: do not skip integ tests
        return
    skip_load_test = pytest.mark.skip(reason="need --load option to run")
    for item in items:
        if "load" in item.keywords:
            item.add_marker(skip_load_test)

    if config.getoption("--integration"):
        # --integration specified on command line: do not skip integration tests
        pass
    else:
        skip_integration = pytest.mark.skip(reason="need --integration option to run")
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip_integration)


@pytest.fixture(scope="module", autouse=True)
def check_env_unchanged():
    # Capture the initial state of the entire environment
    initial_env = os.environ.copy()

    yield  # Allow tests to run

    # After all tests in the module, compare current env with initial env
    current_env = os.environ.copy()

    # Find differences
    added = set(current_env.keys()) - set(initial_env.keys())
    removed = set(initial_env.keys()) - set(current_env.keys())
    changed = {k for k in initial_env.keys() & current_env.keys() if initial_env[k] != current_env[k]}

    # Ignore the PYTEST_CURRENT_TEST environment variable
    if "PYTEST_CURRENT_TEST" in added:
        added.remove("PYTEST_CURRENT_TEST")
    if "PYTEST_CURRENT_TEST" in removed:
        removed.remove("PYTEST_CURRENT_TEST")
    if "PYTEST_CURRENT_TEST" in changed:
        changed.remove("PYTEST_CURRENT_TEST")

    # Prepare error message if there are differences
    error_msg: List[str] = []
    if added:
        error_msg.append(f"Added environment variables: {added}")
    if removed:
        error_msg.append(f"Removed environment variables: {removed}")
    if changed:
        error_msg.append(f"Changed environment variables: {changed}")

    # Assert that no changes occurred
    assert not error_msg, "Environment changed during test execution:\n" + "\n".join(error_msg)
