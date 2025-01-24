# pyright: reportUnknownMemberType=none
from typing import Any

import pandas as pd

import whylogs as why
from langkit.core.metric import WorkflowMetricConfig, WorkflowMetricConfigBuilder
from langkit.metrics.sentiment_polarity import prompt_response_sentiment_polarity, prompt_sentiment_polarity, response_sentiment_polarity
from langkit.metrics.whylogs_compat import create_whylogs_udf_schema

expected_metrics = [
    "cardinality/est",
    "cardinality/lower_1",
    "cardinality/upper_1",
    "counts/inf",
    "counts/n",
    "counts/nan",
    "counts/null",
    "distribution/max",
    "distribution/mean",
    "distribution/median",
    "distribution/min",
    "distribution/n",
    "distribution/q_01",
    "distribution/q_05",
    "distribution/q_10",
    "distribution/q_25",
    "distribution/q_75",
    "distribution/q_90",
    "distribution/q_95",
    "distribution/q_99",
    "distribution/stddev",
    "type",
    "types/boolean",
    "types/fractional",
    "types/integral",
    "types/object",
    "types/string",
    "types/tensor",
]


df = pd.DataFrame(
    {
        "prompt": [
            "Hi, how are you doing today?",
            "Hi, how are you doing today?",
            "Hi, how are you doing today?",
            "Hi, how are you doing today?",
        ],
        "response": [
            "I'm doing great, how about you?",
            "I'm doing great, how about you?",
            "I'm doing great, how about you?",
            "I'm doing great, how about you?",
        ],
    }
)


def _log(item: Any, conf: WorkflowMetricConfig) -> pd.DataFrame:
    schema = create_whylogs_udf_schema(conf)
    return why.log(item, schema=schema).view().to_pandas()  # type: ignore


def test_prompt_sentiment_neutral():
    schema = WorkflowMetricConfigBuilder().add(prompt_sentiment_polarity).build()
    row = {"prompt": "Hi, how are you doing today?", "response": "I'm doing great, how about you?"}

    actual = _log(row, schema)
    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "prompt.sentiment.sentiment_score",
        "response",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.sentiment.sentiment_score"] == 0


def test_prompt_sentiment_negative():
    schema = WorkflowMetricConfigBuilder().add(prompt_sentiment_polarity).build()

    row = {"prompt": "Hello, you suck and you're the worst. this is horrible...", "response": "I'm doing great, how about you?"}

    actual = _log(row, schema)
    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "prompt.sentiment.sentiment_score",
        "response",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.sentiment.sentiment_score"] < -0.5


def test_prompt_sentiment_postive():
    schema = WorkflowMetricConfigBuilder().add(prompt_sentiment_polarity).build()

    row = {"prompt": "Hello, you are great, everything is so nice! You're the best.", "response": "I'm doing great, how about you?"}

    actual = _log(row, schema)
    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "prompt.sentiment.sentiment_score",
        "response",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.sentiment.sentiment_score"] > 0.5


def test_response_sentiment_neutral():
    schema = WorkflowMetricConfigBuilder().add(response_sentiment_polarity).build()
    row = {"prompt": "Hi, how are you doing today?", "response": "good?"}

    actual = _log(row, schema)
    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "response",
        "response.sentiment.sentiment_score",
    ]

    assert actual.index.tolist() == expected_columns
    assert (
        actual["distribution/max"]["response.sentiment.sentiment_score"] <= 0.5
        and actual["distribution/max"]["response.sentiment.sentiment_score"] >= -0.5
    )


def test_response_sentiment_negative():
    schema = WorkflowMetricConfigBuilder().add(response_sentiment_polarity).build()
    row = {"prompt": "Hi, how are you doing today?", "response": "bad!"}

    actual = _log(row, schema)
    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "response",
        "response.sentiment.sentiment_score",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["response.sentiment.sentiment_score"] < -0.5


def test_response_sentiment_positive():
    schema = WorkflowMetricConfigBuilder().add(response_sentiment_polarity).build()
    row = {"prompt": "Hi, how are you doing today?", "response": "the best ever!!"}

    actual = _log(row, schema)
    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "response",
        "response.sentiment.sentiment_score",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["response.sentiment.sentiment_score"] > 0.5


def test_prompt_response_sentiment_neutral():
    schema = WorkflowMetricConfigBuilder().add(prompt_response_sentiment_polarity).build()
    row = {"prompt": "Hi, how are you doing today?", "response": "good?"}

    actual = _log(row, schema)
    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "prompt.sentiment.sentiment_score",
        "response",
        "response.sentiment.sentiment_score",
    ]

    assert actual.index.tolist() == expected_columns
    assert (
        actual["distribution/max"]["prompt.sentiment.sentiment_score"] <= 0.5
        and actual["distribution/max"]["prompt.sentiment.sentiment_score"] >= -0.5
    )
    assert (
        actual["distribution/max"]["response.sentiment.sentiment_score"] <= 0.5
        and actual["distribution/max"]["response.sentiment.sentiment_score"] >= -0.5
    )


def test_prompt_response_sentiment_negative():
    schema = WorkflowMetricConfigBuilder().add(prompt_response_sentiment_polarity).build()
    row = {"prompt": "you're actually teh worst, this sucks, i hate you", "response": "lul u suck actuly, this is the horrible"}

    actual = _log(row, schema)
    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "prompt.sentiment.sentiment_score",
        "response",
        "response.sentiment.sentiment_score",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.sentiment.sentiment_score"] < -0.5
    assert actual["distribution/max"]["response.sentiment.sentiment_score"] < -0.5


def test_prompt_response_sentiment_positive():
    schema = WorkflowMetricConfigBuilder().add(prompt_response_sentiment_polarity).build()
    row = {"prompt": "you're actually teh best, this is great, i love you", "response": "lul u r teh best, this is the best"}

    actual = _log(row, schema)
    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "prompt.sentiment.sentiment_score",
        "response",
        "response.sentiment.sentiment_score",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.sentiment.sentiment_score"] > 0.5
    assert actual["distribution/max"]["response.sentiment.sentiment_score"] > 0.5
