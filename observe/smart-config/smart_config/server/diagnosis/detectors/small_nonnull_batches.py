from typing import Optional
from whylabs_toolkit.monitor.models import Analyzer, ComplexMetrics

from smart_config.server.diagnosis.analyzer_matchers import (
    is_ratio_metric,
    has_trailing_baseline,
    is_statistical_metric,
)
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class SmallNonNullBatches(ConditionDetector):
    condition = "small_nonnull_batches"
    summary = "less than 500 non-null records in 50% or more of the batches"
    required_data = ["diagnostic_batches"]

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Are more than 50% of the counts under 500 (excluding single-valued)?
        df_all = data.diagnostic_batches
        df_all["nonnull"] = df_all["count"] - df_all["count_null"]
        df = df_all[df_all["count"] > 1]
        df = (
            df.groupby("column")
            .agg(
                over=("nonnull", lambda x: ((x > 500) | (x == 1)).sum()),
                under=("nonnull", lambda x: ((500 > x) & (x > 1)).sum()),
            )
            .reset_index()
        )
        df["frac_small"] = df["under"] / (df["over"] + df["under"])
        df.sort_values(by=["frac_small"], ascending=False)
        cols = list(df[df["frac_small"] > 0.5]["column"])
        if len(cols):
            return Condition(self, columns=cols)
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return (
            is_statistical_metric(analyzer.config.metric)
            or analyzer.config.metric == ComplexMetrics.frequent_items
            or (
                is_ratio_metric(analyzer.config.metric)
                and has_trailing_baseline(analyzer)
            )
        )
