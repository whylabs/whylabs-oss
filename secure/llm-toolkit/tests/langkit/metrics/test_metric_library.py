from typing import List

from langkit.core.workflow import Workflow
from langkit.metrics.library import lib


def test_recommended():
    wf = Workflow(metrics=[lib.presets.recommended()])
    result = wf.run({"prompt": "hi", "response": "I'm doing great!"})
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "prompt.pii.phone_number",
        "prompt.pii.email_address",
        "prompt.pii.credit_card",
        "prompt.pii.us_ssn",
        "prompt.pii.us_bank_number",
        "prompt.pii.redacted",
        "prompt.stats.token_count",
        "prompt.stats.char_count",
        "prompt.similarity.injection",
        "prompt.similarity.injection_neighbor_ids",
        "prompt.similarity.injection_neighbor_coordinates",
        "response.pii.phone_number",
        "response.pii.email_address",
        "response.pii.credit_card",
        "response.pii.us_ssn",
        "response.pii.us_bank_number",
        "response.pii.redacted",
        "response.stats.token_count",
        "response.stats.char_count",
        "response.stats.flesch_reading_ease",
        "response.sentiment.sentiment_score",
        "response.toxicity.toxicity_score",
        "response.similarity.refusal",
        "id",
    ]


def test_io_custom_columns():
    wf = Workflow(metrics=[lib.CUSTOM_COLUMN.similarity.CUSTOM_COLUMN_2(CUSTOM_COLUMN="a", CUSTOM_COLUMN_2="b")])
    result = wf.run({"a": "hi", "b": "I'm doing great!"})
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "a.similarity.b",
        "id",
    ]


def test_io_custom_prompt_column():
    wf = Workflow(metrics=[lib.response.similarity.CUSTOM_COLUMN(CUSTOM_COLUMN="a")])
    result = wf.run({"a": "hi", "response": "I'm doing great!"})
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    print(metrics.T)
    assert metric_names == [
        "response.similarity.a",
        "id",
    ]


def test_io_custom_response_column():
    wf = Workflow(metrics=[lib.prompt.similarity.CUSTOM_COLUMN(CUSTOM_COLUMN="custom_response")])
    result = wf.run({"prompt": "hi", "custom_response": "I'm doing great!"})
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "prompt.similarity.custom_response",
        "id",
    ]
