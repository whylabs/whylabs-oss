from typing import Any

import pandas as pd
import pytest

import whylogs as why
from langkit.core.metric import WorkflowMetricConfig, WorkflowMetricConfigBuilder
from langkit.core.workflow import Workflow
from langkit.metrics.library import lib
from langkit.metrics.topic import prompt_topic_module
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


def _log(item: Any, conf: WorkflowMetricConfig) -> pd.DataFrame:
    schema = create_whylogs_udf_schema(conf)
    return why.log(item, schema=schema).view().to_pandas()  # type: ignore


def test_topic():
    df = pd.DataFrame(
        {
            "prompt": [
                "Who is the president of the United States?",
                "What improves GDP?",
                "What causes global warming?",
                "Who was the star of the movie Titanic?",
            ],
            "response": [
                "George Washington is the president of the United States.",
                "GDP is improved by increasing the money supply.",
                "Global warming is caused by greenhouse gases.",
                "Leonardo DiCaprio was the star of the movie Titanic.",
            ],
        }
    )

    schema = WorkflowMetricConfigBuilder().add(prompt_topic_module).build()

    actual = _log(df, schema)

    expected_columns = [
        "prompt",
        "prompt.topics.economy",
        "prompt.topics.entertainment",
        "prompt.topics.medical",
        "prompt.topics.technology",
        "response",
    ]

    assert actual.index.tolist() == expected_columns  # pyright: ignore[reportUnknownMemberType]


def test_topic_wf():
    df = pd.DataFrame(
        {
            "prompt": [
                "Who is the president of the United States?",
                "What improves GDP?",
                "What causes global warming?",
                "Who was the star of the movie Titanic?",
            ],
            "response": [
                "George Washington is the president of the United States.",
                "GDP is improved by increasing the money supply.",
                "Global warming is caused by greenhouse gases.",
                "Leonardo DiCaprio was the star of the movie Titanic.",
            ],
        }
    )

    wf = Workflow(metrics=[lib.prompt.topics(topics=["economy", "entertainment", "medical", "technology"], onnx=False)])
    wf_onnx = Workflow(metrics=[lib.prompt.topics(topics=["economy", "entertainment", "medical", "technology"], onnx=True)])

    result = wf.run(df)
    result_onnx = wf_onnx.run(df)

    expected_columns = [
        "prompt.topics.economy",
        "prompt.topics.entertainment",
        "prompt.topics.medical",
        "prompt.topics.technology",
        "id",
    ]

    assert sorted(result.metrics.columns.tolist()) == sorted(expected_columns)
    assert sorted(result_onnx.metrics.columns.tolist()) == sorted(expected_columns)
    assert_frames_approx_equal(result.metrics, result_onnx.metrics, tol=1e-5)


def test_topic_empty_input():
    df = pd.DataFrame(
        {
            "prompt": [
                "",
            ],
            "response": [
                "George Washington is the president of the United States.",
            ],
        }
    )

    # schema = WorkflowMetricConfigBuilder().add(prompt_topic_module).build()
    wf = Workflow(metrics=[prompt_topic_module])

    results = wf.run(df)

    expected_columns = [
        "prompt.topics.medical",
        "prompt.topics.economy",
        "prompt.topics.technology",
        "prompt.topics.entertainment",
        "id",
    ]

    assert sorted(results.metrics.columns.tolist()) == sorted(expected_columns)


def test_topic_empty_input_wf():
    df = pd.DataFrame(
        {
            "prompt": [
                "",
            ],
            "response": [
                "George Washington is the president of the United States.",
            ],
        }
    )
    expected_metrics = ["prompt.topics.economy", "prompt.topics.entertainment", "prompt.topics.medical", "prompt.topics.technology"]
    wf = Workflow(metrics=[prompt_topic_module])
    actual = wf.run(df)
    for metric_name in expected_metrics:
        assert actual.metrics[metric_name][0] < 0.5


def test_topic_row():
    row = {
        "prompt": "Who is the president of the United States?",
        "response": "George Washington is the president of the United States.",
    }

    schema = WorkflowMetricConfigBuilder().add(prompt_topic_module).build()

    actual = _log(row, schema)

    expected_columns = [
        "prompt",
        "prompt.topics.economy",
        "prompt.topics.entertainment",
        "prompt.topics.medical",
        "prompt.topics.technology",
        "response",
    ]

    assert actual.index.tolist() == expected_columns  # pyright: ignore[reportUnknownMemberType]


def test_topic_library():
    df = pd.DataFrame(
        {
            "prompt": [
                "What's the best kind of bait?",
                "What's the best kind of punch?",
                "What's the best kind of trail?",
                "What's the best kind of swimming stroke?",
            ],
            "response": [
                "The best kind of bait is worms.",
                "The best kind of punch is a jab.",
                "The best kind of trail is a loop.",
                "The best kind of stroke is freestyle.",
            ],
        }
    )

    topics = ["fishing", "boxing", "hiking", "swimming"]
    wf = Workflow(metrics=[lib.prompt.topics(topics=topics), lib.response.topics(topics=topics)])
    result = wf.run(df)
    actual = result.metrics

    expected_columns = [
        "prompt.topics.fishing",
        "prompt.topics.boxing",
        "prompt.topics.hiking",
        "prompt.topics.swimming",
        "response.topics.fishing",
        "response.topics.boxing",
        "response.topics.hiking",
        "response.topics.swimming",
        "id",
    ]

    assert sorted(actual.columns.tolist()) == sorted(expected_columns)

    assert actual["prompt.topics.fishing"][0] > 0.50
    assert actual["prompt.topics.boxing"][1] > 0.50
    assert actual["prompt.topics.hiking"][2] > 0.50
    assert actual["prompt.topics.swimming"][3] > 0.50

    assert actual["response.topics.fishing"][0] > 0.50
    assert actual["response.topics.boxing"][1] > 0.50
    assert actual["response.topics.hiking"][2] > 0.50
    assert actual["response.topics.swimming"][3] > 0.50


def test_topic_name_sanitize():
    df = pd.DataFrame(
        {
            "prompt": [
                "What's the best kind of bait?",
            ],
            "response": [
                "The best kind of bait is worms.",
            ],
        }
    )

    topics = ["Fishing supplies"]
    wf = Workflow(metrics=[lib.prompt.topics(topics=topics), lib.response.topics(topics=topics)])

    result = wf.run(df)
    actual = result.metrics

    expected_columns = [
        "prompt.topics.fishing_supplies",
        "response.topics.fishing_supplies",
        "id",
    ]
    assert sorted(actual.columns.tolist()) == sorted(expected_columns)
    assert actual["prompt.topics.fishing_supplies"][0] > 0.50


def assert_frames_approx_equal(df1: pd.DataFrame, df2: pd.DataFrame, tol=1e-6):
    assert df1.shape == df2.shape, "DataFrames are of different shapes"
    for col in df1.columns:
        assert col in df2.columns, f"Column {col} missing from second DataFrame"
        for idx in df1.index:  # type: ignore
            assert idx in df2.index, f"Index {idx} missing from second DataFrame"  # pyright: ignore[reportUnknownMemberType]
            val1 = df1.at[idx, col]  # type: ignore
            val2 = df2.at[idx, col]  # type: ignore
            assert val1 == pytest.approx(val2, abs=tol), f"Values at {idx}, {col} differ: {val1} != {val2}"  # type: ignore


# TODO test the feature flag logic
def test_topic_feature_flag_off():
    # This tests that we can toggle between the internal vector db versions of our metrics and the zero shot topic classifier
    df = pd.DataFrame(
        {
            "prompt": [
                "What's the best kind of bait?",
            ],
        }
    )

    # these will have the same output, feature flag defaults to off
    wf_zero_shot_individual = Workflow(metrics=[lib.prompt.topics.medical(), lib.prompt.topics.financial(), lib.prompt.topics.code()])
    wf_zero_shot = Workflow(metrics=[lib.prompt.topics(topics=["medical", "financial", "code"])])

    result_zero_shot_individual = wf_zero_shot_individual.run(df)
    actual_zero_shot_individual = result_zero_shot_individual.metrics

    result_zero_shot = wf_zero_shot.run(df)
    actual_zero_shot = result_zero_shot.metrics

    expected_zero_shot = [
        {
            "id": "0",
            "prompt.topics.code": pytest.approx(0.005043745972216129, abs=1e-5),  # pyright: ignore[reportUnknownMemberType]
            "prompt.topics.financial": pytest.approx(0.0017265300266444683, abs=1e-5),  # pyright: ignore[reportUnknownMemberType]
            "prompt.topics.medical": pytest.approx(0.002253300976008177, abs=1e-5),  # pyright: ignore[reportUnknownMemberType]
        }
    ]
    assert actual_zero_shot_individual.to_dict(orient="records") == expected_zero_shot  # pyright: ignore[reportUnknownMemberType]
    assert actual_zero_shot.to_dict(orient="records") == expected_zero_shot  # pyright: ignore[reportUnknownMemberType]
