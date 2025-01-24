from functools import cache, partial
from logging import getLogger
from typing import List, Optional

import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import Metric, MetricCreator, MetricResultType, MultiMetric, MultiMetricResult, WorkflowOptions
from langkit.metrics.embeddings_utils import as_numpy
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.transformer import EmbeddingChoiceArg, EmbeddingContextDependency, EmbeddingOptions
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import AssetStage, SentenceTransformerEncoder
from whylabs_llm_toolkit.models.chroma.db import ChromaVectorDB
from whylabs_llm_toolkit.models.pca.pca_coordinates import PCACoordinates
from whylabs_llm_toolkit.settings import get_settings

logger = getLogger(__name__)


@cache
def create_chroma_db(
    encoder_name: SentenceTransformerEncoder,
    label: Labels,
    stage: AssetStage,
    version: Optional[int] = None,
    neighbor_num: Optional[int] = None,
    local_path: Optional[str] = None,
    additional_data_url: Optional[str] = None,
) -> ChromaVectorDB:
    chroma_db = ChromaVectorDB(
        encoder_name,
        stage=stage,
        version=version,
        neighbor_num=neighbor_num,
        local_path=local_path,
        label=label,
        additional_data_url=additional_data_url,
    )
    return chroma_db


def topic_chroma_metric(
    column_name: str,
    topic: Labels,
    version: Optional[int] = None,
    pca_version: Optional[int] = None,
    choice: Optional[EmbeddingChoiceArg] = None,
    stage: Optional[AssetStage] = None,
    pca_stage: Optional[AssetStage] = None,
    neighbors_num: Optional[int] = None,
    return_neighbors: Optional[bool] = None,
    local_path: Optional[str] = None,
    additional_data_url: Optional[str] = None,
) -> MetricCreator:
    def _metric(options: WorkflowOptions) -> Metric:
        _choice = choice or WorkflowOptionUtil.get_embedding_choice(options) or "default"
        encoder_name = EmbeddingOptions.get_supported_encoder(_choice)

        settings = get_settings()
        _stage = stage or settings.DEFAULT_ASSET_STAGE
        _pca_stage = pca_stage or settings.DEFAULT_ASSET_STAGE
        chroma_db = create_chroma_db(
            encoder_name,
            stage=_stage,
            version=version,
            neighbor_num=neighbors_num,
            local_path=local_path,
            label=topic,
            additional_data_url=additional_data_url,
        )

        coordinates = PCACoordinates(EmbeddingOptions.get_supported_encoder(_choice), stage=_pca_stage, version=pca_version)

        def cache_assets():
            coordinates.cache_assets()
            chroma_db.cache_assets()

        def init():
            coordinates.init()
            chroma_db.init()

        embedding_dep = EmbeddingContextDependency(embedding_choice=_choice, input_column=column_name)
        names: List[str] = []
        names.append(f"{column_name}.similarity.{topic.name}")
        if return_neighbors:
            names.append(f"{column_name}.similarity.{topic.name}_neighbor_ids")
            names.append(f"{column_name}.similarity.{topic.name}_neighbor_coordinates")

        def udf(text: pd.DataFrame, context: Context) -> MultiMetricResult:
            results: List[MetricResultType] = []
            if column_name not in text.columns:
                raise ValueError(f"Topics: Column {column_name} not found in input dataframe")

            target_embeddings = as_numpy(embedding_dep.get_request_data(context))
            if return_neighbors:
                chroma_result = chroma_db.lookup_embeddings(target_embeddings, return_neighbors=return_neighbors)
                neighbor_ids = chroma_result.id
                neighbor_coordinates = coordinates.generate_pca_coordinates(chroma_result.neighbor_embeddings)
                results.append(chroma_result.metrics)
                results.append(neighbor_ids)
                results.append(neighbor_coordinates.tolist())
            else:
                chroma_result = chroma_db.lookup_embeddings(target_embeddings, return_neighbors=False)
                results.append(chroma_result.metrics)
            return MultiMetricResult(metrics=results)

        return MultiMetric(
            names=names,
            input_names=[column_name],
            evaluate=udf,
            cache_assets=cache_assets,
            init=init,
            context_dependencies=[embedding_dep],
        )

    return _metric


prompt_topic_chroma_metric = partial(topic_chroma_metric, "prompt")
