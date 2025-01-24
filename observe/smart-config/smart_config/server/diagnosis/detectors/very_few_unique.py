from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer, SimpleColumnMetric, AlgorithmType

from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class VeryFewUnique(ConditionDetector):
    condition = 'very_few_unique'
    summary = 'fewer than 5 values with a stddev count monitor'
    required_data = ['diagnostic_batches']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Do any analyzed columns have less than 5 unique count
        unique_count = data.diagnostic_profile.groupby(['column'])['unique_est'].max()
        low_unique_count = unique_count[unique_count < 5]
        if len(low_unique_count) > 0:
            return Condition(self, columns=list(low_unique_count.index))
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return analyzer.config.metric == SimpleColumnMetric.unique_est and analyzer.config.type == AlgorithmType.stddev
