from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer, AlgorithmType, DriftConfig
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class LowDriftThreshold(ConditionDetector):
    condition = 'low_drift_threshold'
    summary = 'drift threshold of {threshold} is lower than typical value of {expected} for the {algo} algorithm'
    required_data = ['analysis_results']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        drift_config: DriftConfig = analyzer.config
        expected = 0.7
        if drift_config.algorithm in ['psi']:
            expected = 0.2
        if drift_config.algorithm in ['jensenshannon', 'kl_divergence']:
            expected = 0.1
        if drift_config.threshold >= expected:
            return None

        cols = data.columns_with_anomaly_pct()
        if len(cols) > 0:
            return Condition(self, info={
                'threshold': drift_config.threshold,
                'expected': expected,
                'algo': drift_config.algorithm
            })
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return analyzer.config.type in [AlgorithmType.drift]
