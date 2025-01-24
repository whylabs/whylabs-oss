from dataclasses import dataclass
from typing import Any, List, Optional

import pandas as pd

from langkit.core.context import Context, VerboseName
from langkit.core.metric import Metric, MetricCreator, MultiMetric, MultiMetricResult, WorkflowOptions
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.transformer import EmbeddingChoiceArg, SetfitTopicContextDependency
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import AssetStage
from whylabs_llm_toolkit.settings import get_settings


@dataclass
class _VerboseMetricName(VerboseName):
    choice: EmbeddingChoiceArg
    stage: AssetStage
    version: Optional[int]
    local_path: Optional[str]


def topic_setfit_metric(
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

        def udf(text: pd.DataFrame, context: Context) -> MultiMetricResult:
            predictions = dep.get_request_data(context)
            df = pd.DataFrame(predictions)
            df["primary_label"] = df.apply(lambda row: SetfitTopicContextDependency.get_label(row).name, axis=1)  # pyright: ignore[reportUnknownArgumentType, reportUnknownLambdaType]
            metrics: List[List[Any]] = list(df.to_dict("list").values())  # pyright: ignore[reportUnknownMemberType]
            return MultiMetricResult(metrics)

        metric_name_query_params = (
            _VerboseMetricName(choice=embedding, stage=_stage, version=version, local_path=local_path).get_verbose_name()
            if settings.VERBOSE_METRIC_NAMES
            else ""
        )

        metric_names = [f"{column_name}.topics.{label.name}{metric_name_query_params}" for label in Labels if label != Labels.none]
        metric_names.append(f"{column_name}.topics.label{metric_name_query_params}")
        return MultiMetric(
            names=metric_names,
            input_names=[column_name],
            evaluate=udf,
            context_dependencies=[dep],
        )

    return _metric
