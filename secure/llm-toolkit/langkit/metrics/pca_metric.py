from typing import Optional

import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import Metric, SingleMetric, SingleMetricResult
from langkit.metrics.embeddings_utils import as_numpy
from langkit.transformer import EmbeddingChoiceArg, EmbeddingContextDependency, EmbeddingOptions
from whylabs_llm_toolkit.data.scripts.targets import AssetStage
from whylabs_llm_toolkit.models.pca.pca_coordinates import PCACoordinates
from whylabs_llm_toolkit.settings import get_settings


def pca_metric(
    column_name: str, choice: Optional[EmbeddingChoiceArg] = None, stage: Optional[AssetStage] = None, version: Optional[int] = None
) -> Metric:
    _choice = choice or "default"
    settings = get_settings()
    _stage = stage or settings.DEFAULT_ASSET_STAGE
    embedding_dep = EmbeddingContextDependency(embedding_choice=_choice, input_column=column_name)
    coordinates = PCACoordinates(EmbeddingOptions.get_supported_encoder(_choice), stage=_stage, version=version)

    def init():
        coordinates.init()

    def cache_assets():
        coordinates.cache_assets()

    def udf(text: pd.DataFrame, context: Context) -> SingleMetricResult:
        embeddings = as_numpy(embedding_dep.get_request_data(context))
        pca_coordinates = coordinates.generate_pca_coordinates(embeddings)
        return SingleMetricResult(metrics=pca_coordinates.tolist())

    return SingleMetric(
        name=f"{column_name}.pca.coordinates",
        input_names=[column_name],
        init=init,
        cache_assets=cache_assets,
        context_dependencies=[embedding_dep],
        evaluate=udf,
        metadata=coordinates.get_metadata,
    )
