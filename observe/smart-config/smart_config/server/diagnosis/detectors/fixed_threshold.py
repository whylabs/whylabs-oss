from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer, AlgorithmType, TargetLevel

from smart_config.server.diagnosis.analyzer_matchers import is_integration_metric
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class FixedThreshold(ConditionDetector):
    condition = 'fixed_threshold_mismatch'
    summary = '50% or more of the batches are outside the specified fixed threshold'
    required_data = ['analysis_results']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        cols = data.columns_with_anomaly_pct()
        if len(cols) > 0:
            return Condition(self, columns=cols)
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return (analyzer.config.type in [AlgorithmType.fixed] and
                analyzer.targetMatrix.type == TargetLevel.column and
                not is_integration_metric(analyzer.config.metric))
