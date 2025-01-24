from typing import Optional
import pandas as pd

from whylabs_toolkit.monitor.models import Analyzer

from smart_config.server.diagnosis.analyzer_matchers import is_integration_metric
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class StaleResults(ConditionDetector):
    condition = 'stale_analysis'
    summary = '{stalePct:.1f}% of the analysis results are stale - data has been uploaded since the analysis'
    required_data = ['analysis_results', 'diagnostic_batches']

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Are more than 10% of the results stale?
        last_upload = data.diagnostic_batches.groupby(['timestamp'])['last_upload_ts'].max()
        analysis_creation = data.analysis_results.groupby(['datasetTimestamp'])['creationTimestamp'].min()
        stale = (analysis_creation - last_upload).loc[lambda x: (~pd.isna(x)) & (x < 0)]
        # Using min of profile and analysis because missing data point can generate analysis where theres no upload
        stale_frac = len(stale) / min(len(analysis_creation), len(last_upload))
        if stale_frac > 0.1:
            return Condition(self,  info={'stalePct': stale_frac * 100})
        return None

    def matches_analyzer(self, analyzer: Analyzer):
        return not is_integration_metric(analyzer.config.metric)

