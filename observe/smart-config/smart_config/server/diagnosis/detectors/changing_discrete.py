from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer, ComplexMetrics
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class ChangingDiscrete(ConditionDetector):
    condition = 'changing_discrete'
    summary = 'many values are unique across batches'
    required_data = ['diagnostic_batches', 'diagnostic_profile']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Do any analyzed features have 50% of the values unique in each batch?
        unique_count_per_batch = data.diagnostic_batches.groupby(['column'])['unique_est']
        # sum_unique_count = unique_count_per_batch.sum()
        max_unique_count = unique_count_per_batch.max()
        # count_unique_count = unique_count_per_batch.count()
        sum_rollup_unique_count = data.diagnostic_profile.groupby(['column'])['unique_est'].sum()
        # this is a crude test that wont handle lots of rare values
        neg_if_changing = 2 * max_unique_count - sum_rollup_unique_count
        changing_columns = neg_if_changing[neg_if_changing < 0]
        if len(changing_columns) > 0:
            return Condition(self, columns=list(changing_columns.index))
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return analyzer.config.metric == ComplexMetrics.frequent_items
