from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class MissingBaselineBatches(ConditionDetector):
    condition = 'missing_baseline_batches'
    summary = 'half of the expected baseline batches are missing in 20% or more of the analyses'
    required_data = ['analysis_results']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # check if half of expected baseline batches are missing in more than 20% of analyses
        df = data.analysis_results.copy()
        df['missing_batches'] = (
                (df['expectedBaselineCount'] - df['baselineCount']) / df['expectedBaselineCount'])
        df = df.groupby('column').agg(
            over=('missing_batches', lambda x: (x >= 0.5).sum()),
            under=('missing_batches', lambda x: (x < 0.5).sum())).reset_index()
        df['frac_missing'] = df['over'] / (df['over'] + df['under'])
        df.sort_values(by=['frac_missing'], ascending=False)
        cols = list(df[df['frac_missing'] > 0.2]['column'])
        if len(cols) > 0:
            return Condition(self, columns=cols)
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return getattr(analyzer.config, 'baseline', None) is not None
