from functools import partial
from typing import List, cast

import numpy as np
import pandas as pd
import pytest

from langkit.core.metric import MetricCreator
from langkit.core.workflow import Workflow
from langkit.metrics.embeddings_utils import as_numpy
from langkit.metrics.pca_metric import pca_metric
from langkit.transformer import EmbeddingOptions, WhyLabsSupportedEncoder
from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.models.pca.pca_coordinates import PCACoordinates

_encoders = [
    # TODO these two don't perform well enough to pass these tests
    WhyLabsSupportedEncoder(SentenceTransformerEncoder.AllMiniLML6V2.name),
    WhyLabsSupportedEncoder(SentenceTransformerEncoder.ParaphraseMultilingualMiniLML12V2.name),
    WhyLabsSupportedEncoder(SentenceTransformerEncoder.ParaphraseMultilingualMpnetBaseV2.name),
]


@pytest.mark.parametrize("choice", _encoders)
def test_coordinates(choice: WhyLabsSupportedEncoder):
    metrics: List[MetricCreator] = [partial(pca_metric, "prompt", choice, "dev")]

    wf = Workflow(metrics=metrics)

    df = pd.DataFrame(
        {
            "prompt": ["What year was aspirin created?", "How many milligrams of aspirin should I take?"],
        }
    )

    result = wf.run(df)
    result_metrics = result.metrics
    coordinates = cast(List[List[float]], result_metrics["prompt.pca.coordinates"].tolist())

    assert np.array(coordinates).shape == (2, 3)


def test_metadata():
    choice = WhyLabsSupportedEncoder(SentenceTransformerEncoder.AllMiniLML6V2.name)
    metrics: List[MetricCreator] = [partial(pca_metric, "prompt", choice, "dev", version=6)]

    wf = Workflow(metrics=metrics)

    df = pd.DataFrame(
        {
            "prompt": ["What year was aspirin created?", "How many milligrams of aspirin should I take?"],
        }
    )

    result = wf.run(df)
    result_metrics = result.metrics
    coordinates = cast(List[List[float]], result_metrics["prompt.pca.coordinates"].tolist())

    metadata = wf.get_metric_metadata()["prompt.pca.coordinates"]
    assert metadata["encoder"] == "all-MiniLM-L6-v2"
    assert metadata["encoder_revision"] == "8b3219a92973c328a8e22fadcfa821b5dc75636a"
    assert isinstance(metadata["sha"], str)
    assert isinstance(metadata["toolkit_version"], str)
    assert metadata["asset_version"] == 6

    assert np.array(coordinates).shape == (2, 3)


def test_coordinate_batched_input():
    choice = WhyLabsSupportedEncoder(SentenceTransformerEncoder.AllMiniLML6V2.name)
    encoder = EmbeddingOptions.get_encoder(choice)
    coordinates = PCACoordinates(EmbeddingOptions.get_supported_encoder(choice), stage="dev")
    batch1 = as_numpy(encoder.encode(tuple(["prompt 1", "prompt 2"])))
    batch2 = as_numpy(encoder.encode(tuple(["prompt 3", "prompt 4"])))
    embeddings = np.array([batch1, batch2])

    assert embeddings.shape == (2, 2, 384)

    coords = coordinates.generate_pca_coordinates(embeddings)
    assert coords.shape == (2, 2, 3)
