from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer

from smart_config.server.diagnosis.analyzer_matchers import has_fixed_baseline, is_integration_metric
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class FixedBaseline(ConditionDetector):
    condition = 'fixed_baseline_mismatch'
    summary = 'fixed baseline may not be representative as anomalies are flagged in 50% or more of the batches'
    required_data = ['analysis_results']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        cols = data.columns_with_anomaly_pct()
        if len(cols) > 0:
            return Condition(self,columns=cols)
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return has_fixed_baseline(analyzer) and not is_integration_metric(analyzer.config.metric)
