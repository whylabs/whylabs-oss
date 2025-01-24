from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer, SimpleColumnMetric
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class ManyUnique(ConditionDetector):
    condition = 'many_unique'
    summary = 'more than 0.05 unique ratio'
    required_data = ['diagnostic_profile']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Do any analyzed columns have a unique ratio of more than 0.05?
        unique_ratio = data.diagnostic_profile.groupby(['column'])['unique_est_ratio'].min()
        high_unique_ratio = unique_ratio[unique_ratio > 0.05]
        if len(high_unique_ratio) > 0:
            return Condition(self, columns=list(high_unique_ratio.index))
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return analyzer.config.metric == SimpleColumnMetric.unique_est
