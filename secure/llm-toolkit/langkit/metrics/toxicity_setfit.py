from typing import List, Optional

import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import (
    Metric,
    MetricCreator,
    SingleMetric,
    SingleMetricResult,
    WorkflowOptions,
)
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.transformer import EmbeddingChoiceArg, SetfitTopicContextDependency
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import AssetStage
from whylabs_llm_toolkit.settings import get_settings


def toxicity_setfit_metric(
    column_name: str,
    choice: Optional[EmbeddingChoiceArg] = None,
    stage: Optional[AssetStage] = None,
    version: Optional[int] = None,
    filter_innocuous: bool = True,
) -> MetricCreator:
    def _metric(options: WorkflowOptions) -> Metric:
        settings = get_settings()
        _stage = stage or settings.DEFAULT_ASSET_STAGE
        embedding = choice or WorkflowOptionUtil.get_embedding_choice(options) or "default"
        dep = SetfitTopicContextDependency(
            embedding_choice=embedding, stage=_stage, embedding_context_input_column=column_name, version=version
        )

        def udf(text: pd.DataFrame, context: Context) -> SingleMetricResult:
            predictions = dep.get_request_data(context)

            results: List[float] = []
            for prediction in predictions:
                if filter_innocuous:
                    is_innnocuous = SetfitTopicContextDependency.get_label(prediction) == Labels.innocuous
                    if is_innnocuous:
                        results.append(0.0)
                        continue

                toxicity_score = Labels.get_prediction(Labels.toxic, prediction)
                hate_score = Labels.get_prediction(Labels.hate, prediction)
                results.append(float(max(toxicity_score, hate_score)))

            return SingleMetricResult(results)

        metric_name_query_params = "?setfit=True" if settings.VERBOSE_METRIC_NAMES else ""
        return SingleMetric(
            name=f"{column_name}.toxicity.toxicity_score{metric_name_query_params}",
            input_names=[column_name],
            evaluate=udf,
            context_dependencies=[dep],
        )

    return _metric
