import os
from functools import partial
from typing import Any, List

import pandas as pd
import pytest

from langkit.core.metric import MetricCreator, WorkflowOptions
from langkit.core.workflow import Workflow
from langkit.metrics.topic_setfit import topic_setfit_metric
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.transformer import WhyLabsSupportedEncoder
from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.settings import reload_settings

_encoders = [
    SentenceTransformerEncoder.AllMiniLML6V2,
    # THese don't perform well enough to reliably include them in tests yet
    # SentenceTransformerEncoder.ParaphraseMultilingualMiniLML12V2,
    # SentenceTransformerEncoder.ParaphraseMultilingualMpnetBaseV2,
]


def is_innocuous(label: Any) -> bool:
    # these labels are basically interchangable
    test = label == "innocuous" or label == "none"
    if not test:
        print(f"label is not innocuous: {label}")
    return test


@pytest.mark.parametrize("encoder", _encoders)
def test_medical_topics(encoder: SentenceTransformerEncoder):
    choice = WhyLabsSupportedEncoder(encoder.name)
    metrics: List[MetricCreator] = [partial(topic_setfit_metric, column_name="prompt", stage="dev", choice=choice)]

    wf = Workflow(metrics=metrics)

    df = pd.DataFrame(
        {
            "prompt": [
                "What year was aspirin created?",
                "I woke up this morning feeling the whole room is spinning when i was sitting down. I went "
                "to the bathroom walking unsteadily, as i tried to focus i feel nauseous. I try to vomit but "
                "it wont come out.. After taking panadol and sleep for few hours, i still feel the same.. By "
                "the way, if i lay down or sit down, my head do not spin, only when i want to move around then "
                "i feel the whole world is spinning.. And it is normal stomach discomfort at the same time? "
                "Earlier after i relieved myself, the spinning lessen so i am not sure whether its connected "
                "or coincidences.. Thank you doc!",
            ],
        }
    )

    result = wf.run(df)
    result_metrics = result.metrics
    assert is_innocuous(result_metrics["prompt.topics.label"][0])
    assert result_metrics["prompt.topics.label"][1] == "medical"


def test_encoder_options():
    # This metric is set up to prefer the encoder that is specified in the workflow options if it exists over the 'default'
    metrics: List[MetricCreator] = [topic_setfit_metric(column_name="prompt", stage="dev")]

    options: WorkflowOptions = {}
    WorkflowOptionUtil.set_embedding_choice(
        options, WhyLabsSupportedEncoder(SentenceTransformerEncoder.ParaphraseMultilingualMpnetBaseV2.name)
    )
    wf = Workflow(metrics=metrics, options=options)

    df = pd.DataFrame(
        {
            "prompt": ["What year was aspirin created?", "How many milligrams of aspirin should I take?"],
        }
    )

    result = wf.run(df)

    context_keys = list(result.perf_info.context_time_sec.keys())

    # It uses the paraphrase-multilingual-mpnet-base-v2 encoder because it was explicitly specified, and it has 'official' up front
    # because it was overriden to the version of the encoder that we explicitly support, as opposed to an arbitrary encoder/version
    # combo from hugging face.
    assert "official_paraphrase-multilingual-mpnet-base-v2" in context_keys[0]
    assert "official_paraphrase-multilingual-mpnet-base-v2" in context_keys[1]


def test_encoder_env():
    # This overrides what is considered to be the 'default' encoder
    os.environ["DEFAULT_ENCODER"] = SentenceTransformerEncoder.ParaphraseMultilingualMpnetBaseV2.name
    reload_settings()

    try:
        # This metric is set up to use whatever the 'default' is
        metrics: List[MetricCreator] = [topic_setfit_metric(column_name="prompt", stage="dev", choice="default")]

        wf = Workflow(metrics=metrics)

        df = pd.DataFrame(
            {
                "prompt": ["What year was aspirin created?", "How many milligrams of aspirin should I take?"],
            }
        )

        result = wf.run(df)

        context_keys = list(result.perf_info.context_time_sec.keys())

        # It ends up using the paraphrase-multilingual-mpnet-base-v2 encoder because it is the default, so it has 'default' up front,
        # as opposed to using the the paraphrase-multilingual-mpnet-base-v2 because it was explicitly specified.
        assert "default_paraphrase-multilingual-mpnet-base-v2" in context_keys[0]
        assert "default_paraphrase-multilingual-mpnet-base-v2" in context_keys[1]

    finally:
        del os.environ["DEFAULT_ENCODER"]
