from functools import partial
from logging import getLogger
from typing import List, Optional

import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import Metric, MetricCreator, MetricResultType, MultiMetric, MultiMetricResult, WorkflowOptions
from langkit.metrics.embeddings_utils import as_numpy
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.transformer import EmbeddingChoiceArg, EmbeddingContextDependency, EmbeddingOptions, SetfitTopicContextDependency
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import AssetStage
from whylabs_llm_toolkit.models.chroma.db_twoclass import ChromaTwoClassVectorDB
from whylabs_llm_toolkit.models.pca.pca_coordinates import PCACoordinates
from whylabs_llm_toolkit.settings import get_settings

logger = getLogger(__name__)


def injections_twoclass_metric_chroma(
    column_name: str,
    version: Optional[int] = None,
    pca_version: Optional[int] = None,
    choice: Optional[EmbeddingChoiceArg] = None,
    stage: Optional[AssetStage] = None,
    pca_stage: Optional[AssetStage] = None,
    neighbors_num: Optional[int] = None,
    return_neighbors: Optional[bool] = None,
    local_path: Optional[str] = None,
    filter_innocuous: Optional[bool] = None,
    additional_data_url: Optional[str] = None,
) -> MetricCreator:
    def _metric(options: WorkflowOptions) -> Metric:
        _choice = choice or WorkflowOptionUtil.get_embedding_choice(options) or "default"
        encoder_name = EmbeddingOptions.get_supported_encoder(_choice)
        return_neighbors_arg = return_neighbors or True
        filter_innocuous_arg = filter_innocuous or False

        settings = get_settings()
        _stage = stage or settings.DEFAULT_ASSET_STAGE
        _pca_stage = pca_stage or settings.DEFAULT_ASSET_STAGE

        chroma = ChromaTwoClassVectorDB(
            encoder_name,
            stage=_stage,
            version=version,
            neighbor_num=neighbors_num,
            local_path=local_path,
            additional_data_url=additional_data_url,
        )

        setfit_dep = SetfitTopicContextDependency(
            embedding_choice=_choice, stage=_stage, embedding_context_input_column=column_name, version=version
        )
        coordinates = PCACoordinates(EmbeddingOptions.get_supported_encoder(_choice), stage=_pca_stage, version=pca_version)

        def cache_assets():
            nonlocal chroma
            coordinates.cache_assets()
            chroma.cache_assets()

        def init():
            nonlocal chroma
            coordinates.init()
            chroma.init()

        embedding_dep = EmbeddingContextDependency(embedding_choice=_choice, input_column=column_name)
        names: List[str] = []
        if filter_innocuous_arg:
            names.append(f"{column_name}.similarity.injection.is_innocuous")
            names.append(f"{column_name}.similarity.injection.is_injection")

        names.append(f"{column_name}.similarity.injection")
        if return_neighbors_arg:
            names.append(f"{column_name}.similarity.injection_neighbor_ids")
            names.append(f"{column_name}.similarity.injection_neighbor_coordinates")

        def udf(text: pd.DataFrame, context: Context) -> MultiMetricResult:
            results: List[MetricResultType] = []
            if column_name not in text.columns:
                raise ValueError(f"Injections: Column {column_name} not found in input dataframe")

            target_embeddings = as_numpy(embedding_dep.get_request_data(context))
            setfit_predictions = setfit_dep.get_request_data(context)

            labels = [SetfitTopicContextDependency.get_label(prediction) for prediction in setfit_predictions]
            if filter_innocuous_arg:
                results.append([True if label == Labels.innocuous else False for label in labels])
                results.append([True if label == Labels.injection else False for label in labels])

            if return_neighbors_arg:
                chroma_result = chroma.lookup_embeddings(target_embeddings, return_neighbors=return_neighbors_arg)
                neighbor_ids = chroma_result.id
                pca_coordinates = coordinates.generate_pca_coordinates(chroma_result.neighbor_embeddings)

            else:
                chroma_result = chroma.lookup_embeddings(target_embeddings, return_neighbors=return_neighbors_arg)
                neighbor_ids = None
                pca_coordinates = None
            similarity_injection_results = [
                0.85 * score if label != Labels.injection else score for label, score in zip(labels, chroma_result.metrics)
            ]
            if filter_innocuous_arg:
                results.append([0 if label == Labels.innocuous else score for label, score in zip(labels, similarity_injection_results)])
            else:
                results.append(similarity_injection_results)

            if neighbor_ids is not None:
                results.append(neighbor_ids)

            if pca_coordinates is not None:
                results.append(pca_coordinates.tolist())

            return MultiMetricResult(metrics=results)

        return MultiMetric(
            names=names,
            input_names=[column_name],
            evaluate=udf,
            cache_assets=cache_assets,
            init=init,
            context_dependencies=[embedding_dep, setfit_dep],
            metadata=coordinates.get_metadata,
        )

    return _metric


prompt_injections_twoclass_metric_chroma = partial(injections_twoclass_metric_chroma, "prompt")
