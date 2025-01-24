from dataclasses import dataclass
from typing import List, Optional

import pandas as pd

from langkit.core.context import Context, VerboseName
from langkit.core.metric import Metric, MetricCreator, SingleMetric, SingleMetricResult, WorkflowOptions
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.transformer import EmbeddingChoiceArg, SetfitTopicContextDependency
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import AssetStage
from whylabs_llm_toolkit.settings import get_settings

_MALICIOUS_LABELS = [Labels.harmful, Labels.hate, Labels.toxic, Labels.injection]


@dataclass
class _MetricName(VerboseName):
    choice: EmbeddingChoiceArg
    stage: AssetStage
    version: Optional[int]
    local_path: Optional[str]

    def get_verbose_title(self) -> str:
        return ""


def malicious_metric(
    column_name: str,
    choice: Optional[EmbeddingChoiceArg] = None,
    stage: Optional[AssetStage] = None,
    version: Optional[int] = None,
    local_path: Optional[str] = None,
) -> MetricCreator:
    def _metric(options: WorkflowOptions) -> Metric:
        settings = get_settings()
        _stage = stage or settings.DEFAULT_ASSET_STAGE
        embedding = choice or WorkflowOptionUtil.get_embedding_choice(options) or "default"
        dep = SetfitTopicContextDependency(
            embedding_choice=embedding, stage=_stage, embedding_context_input_column=column_name, version=version, local_path=local_path
        )

        def udf(text: pd.DataFrame, context: Context) -> SingleMetricResult:
            predictions = dep.get_request_data(context)
            results: List[float] = []
            for pred in predictions:
                malicious_scores = [Labels.get_prediction(label, pred) for label in _MALICIOUS_LABELS]
                results.append(float(max(malicious_scores)))
            metrics: List[float] = results
            return SingleMetricResult(metrics=metrics)

        metric_name_query_params = (
            _MetricName(choice=embedding, stage=_stage, version=version, local_path=local_path).get_verbose_name()
            if settings.VERBOSE_METRIC_NAMES
            else ""
        )

        return SingleMetric(
            name=f"{column_name}.topics.malicious{metric_name_query_params}",
            input_names=[column_name],
            evaluate=udf,
            context_dependencies=[dep],
        )

    return _metric
