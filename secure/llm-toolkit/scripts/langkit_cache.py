import logging
import os
import sys
from pprint import pprint
from typing import List

from langkit.core.metric import MetricCreator
from langkit.core.workflow import Workflow
from langkit.metrics.library import lib

logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    if "WHYLABS_LLM_TOOLKIT_CACHE" not in os.environ:
        os.environ["WHYLABS_LLM_TOOLKIT_CACHE"] = "./cache_test"

    metrics: List[MetricCreator] = [
        lib.presets.all(),
        lib.prompt.topics.medical(use_experimental_models=True),
        lib.prompt.topics.financial(use_experimental_models=True),
        lib.prompt.topics.code(use_experimental_models=True),
    ]
    wf = Workflow(metrics=metrics, cache_assets="--skip-downloads" not in sys.argv)
    pprint(f"Caching metrics {wf.get_metric_names()}")
    # Run it to ensure nothing else ends up getting lazily cached
    wf.run({"prompt": "How are you today?", "response": "I'm doing great!"})

    expected_assets = [
        "cache_test/assets/medical_dataset",
        "cache_test/assets/toxic-comment-model",
        "cache_test/assets/financial_dataset",
        "cache_test/assets/code_dataset",
        "cache_test/assets/chromadb_twoclass",
    ]
    for asset in expected_assets:
        assert os.path.exists(asset), f"Expected asset {asset} not found"
