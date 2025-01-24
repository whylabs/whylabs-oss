from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer, AlgorithmType
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class StddevInsufficientBaseline(ConditionDetector):
    condition = 'stddev_insufficient_baseline'
    summary = 'baseline has less than 4 batches for 20% of more of the analyses'
    required_data = ['analysis_results']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Raise if baseline has less than 4 batches for 20% or more of the analyses
        # Note this will always be true for ref profiles
        df = data.analysis_results.groupby('column').agg(
            enough=('baselineCount', lambda x: (x >= 4).sum()),
            toolittle=('baselineCount', lambda x: (x < 4).sum())).reset_index()
        df['frac_enough'] = df['enough'] / (df['enough'] + df['toolittle'])
        cols = list(df[df['frac_enough'] < 0.2]['column'])
        if len(cols) > 0:
            return Condition(self, columns=cols)
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return analyzer.config.type == AlgorithmType.stddev
