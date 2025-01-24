import os
from typing import List

import pandas as pd
import pytest

from whylabs_llm_toolkit.datasets import CodeDataset, HarmDataset, MedicalDataset, RefusalsDataset
from whylabs_llm_toolkit.models.semantic_similarity import (
    CodeScorer,
    InjectionScorer,
    MedicalScorer,
    RefusalsScorer,
)
from whylabs_llm_toolkit.settings import reload_settings


@pytest.fixture(autouse=True)
def init():
    os.environ["WHYLABS_LLM_TOOLKIT_FORCE_DOWNLOAD"] = "true"
    reload_settings()
    yield
    del os.environ["WHYLABS_LLM_TOOLKIT_FORCE_DOWNLOAD"]
    reload_settings()


@pytest.mark.integration
def test_refusal_empty_version():
    # If version is empty, creates a new dataset from scratch
    ds = RefusalsDataset(tag="")

    examples_to_add = ["This is a random sentence."]

    ds.add_examples(examples_to_add, label=1, source="MyCustomSource")

    scorer: RefusalsScorer = ds.get_scorer()  # type: ignore

    score = scorer.predict(["This is a random sentence.", "hellloaoskoak"])
    if isinstance(score, List):
        assert score[0] > 0.9
        assert score[1] < 0.2
    else:
        raise ValueError("Score is not a list.")


@pytest.mark.integration
def test_injections_empty_version():
    # If version is empty, creates a new dataset from scratch
    ds = HarmDataset(tag="")

    examples_to_add = ["This is a random sentence."]

    ds.add_examples(examples_to_add, label=1, source="MyCustomSource", injection=True, harmful=True)

    scorer: InjectionScorer = ds.get_scorer()  # type: ignore

    score = scorer.predict(["This is a random sentence.", "hellloaoskoak"])
    if isinstance(score, List):
        assert score[0] > 0.9
        assert score[1] < 0.2
    else:
        raise ValueError("Score is not a list.")


@pytest.mark.integration
def test_medical_empty_version():
    # If version is empty, creates a new dataset from scratch
    ds = MedicalDataset(tag="")

    examples_to_add = ["This is a random sentence."]

    ds.add_examples(examples_to_add, label=1, source="MyCustomSource")

    scorer: MedicalScorer = ds.get_scorer()  # type: ignore

    score = scorer.predict(["This is a random sentence.", "hellloaoskoak"])
    if isinstance(score, List):
        assert score[0] > 0.9
        assert score[1] < 0.2
    else:
        raise ValueError("Score is not a list.")


@pytest.mark.integration
def test_code_empty_version():
    # If version is empty, creates a new dataset from scratch
    ds = CodeDataset(tag="")

    examples_to_add = ["This is a random sentence."]

    ds.add_examples(examples_to_add, label=1, source="MyCustomSource")

    scorer: CodeScorer = ds.get_scorer()  # type: ignore

    score = scorer.predict(["This is a random sentence.", "hellloaoskoak"])
    if isinstance(score, List):
        assert score[0] > 0.9
        assert score[1] < 0.2
    else:
        raise ValueError("Score is not a list.")


@pytest.mark.integration
def test_add_bulk_and_remove():
    df_to_add = pd.DataFrame(
        {
            "text": ["This is a random sentence.", "Another random sentence"],
            "label": [1, 1],
            "source": ["source1", "source2"],
            "properties": ["{}", "{}"],
        }
    )
    ds = CodeDataset(tag="")
    assert ds.df.empty
    ds.add_bulk_examples(df_to_add)
    assert len(ds.df) == 2
    assert len(ds.added_source_data) == 2
    ds.remove_examples([1])
    assert len(ds.df) == 1
    assert len(ds.added_source_data) == 3  # when removing data, adds to added_source_data with source named 'removed'
    assert "removed" in [x[1] for x in ds.added_source_data]
