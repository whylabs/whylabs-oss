from typing import Optional
from whylabs_toolkit.monitor.models import Analyzer, AlgorithmType

from smart_config.server.diagnosis.analyzer_matchers import has_threshold_band
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class NarrowThresholdBand(ConditionDetector):
    condition = 'narrow_threshold_band'
    summary = 'lower to upper threshold bound is less than 0.5% in more than 50% of batches'
    required_data = ['analysis_results']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Note: only applies if there is an upper and lower bound, needs test
        df = data.analysis_results
        df['threshold_band_pct'] = ((df['threshold_upper'] - df['threshold_lower'])/df['threshold_lower']).abs()
        df['is_narrow'] = df['threshold_band_pct'].lt(0.005)
        narrow_by_col = df.groupby(['column'])['is_narrow'].sum()
        total_by_col = df.groupby(['column'])['is_narrow'].count()
        mainly_narrow = (narrow_by_col/total_by_col)[lambda x: x > 0.5]
        if len(mainly_narrow) > 0:
            return Condition(self, columns=mainly_narrow.index.tolist())
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        # excluding diff for now as it doesnt have threshold_upper and threshold_lower in analysis records
        return has_threshold_band(analyzer) and analyzer.config.type != AlgorithmType.diff
