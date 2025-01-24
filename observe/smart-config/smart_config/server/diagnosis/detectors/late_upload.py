from typing import Optional
import numpy as np

from whylabs_toolkit.monitor.models import Analyzer
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class LateUpload(ConditionDetector):
    condition = 'late_upload_mismatch'
    summary = '{latePct:.1f} of present batches are later than the specified criteria'
    required_data = ['analysis_results', 'diagnostic_batches']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        df = data.analysis_results
        alerted_batches = df[df['anomalyCount'] > 0]['datasetTimestamp'].to_numpy()
        present_batches = data.diagnostic_batches['timestamp'].unique()
        late_batches = np.setdiff1d(alerted_batches, present_batches)
        # grace_period = parse_duration(analyzer.dataReadinessDuration).total_seconds() * 1000
        late_frac = len(late_batches)/len(present_batches)
        if late_frac > 0.1:
            return Condition(self, info={'latePct': late_frac * 100, 'lateBatches': late_batches.tolist()})
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return analyzer.config.metric == 'missingDatapoint'

