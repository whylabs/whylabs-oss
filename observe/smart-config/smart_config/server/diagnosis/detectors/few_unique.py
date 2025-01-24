from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer, SimpleColumnMetric
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class FewUnique(ConditionDetector):
    condition = 'few_unique'
    summary = 'fewer than 50 unique values and less than 0.01 ratio'
    required_data = ['diagnostic_profile', 'diagnostic_batches']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Do any analyzed columns have less than 50 unique count and unique ratio of 0.01 or less?
        unique_count = data.diagnostic_profile.groupby(['column'])['unique_est'].max()
        unique_ratio = data.diagnostic_batches.groupby(['column'])['unique_est_ratio'].max()
        low_unique_count = unique_count[unique_count < 50]
        low_unique_ratio = unique_ratio[unique_ratio < 0.01]
        low_both = low_unique_count.index.intersection(low_unique_ratio.index)
        if len(low_both) > 0:
            return Condition(self, columns=list(low_both))
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return analyzer.config.metric == SimpleColumnMetric.unique_est_ratio
