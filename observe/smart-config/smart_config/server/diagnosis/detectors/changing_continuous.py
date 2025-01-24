from math import isclose
from typing import Optional, List
import pandas as pd
from whylabs_toolkit.monitor.models import Analyzer

from smart_config.server.diagnosis.analyzer_matchers import is_statistical_metric
from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


def changing_cols(metric: str, data: DiagnosticData) -> List[str]:
    df = data.diagnostic_batches[['column', metric, 'timestamp']].sort_values(['column', 'timestamp'])
    df = df.dropna(subset=[metric])
    shifted_metric = df.groupby('column')[metric].shift(-1)
    increasing = df[metric].lt(shifted_metric)
    decreasing = df[metric].gt(shifted_metric)
    df['increasing'] = increasing
    df['decreasing'] = decreasing
    changing_count = df[df['increasing'] | df['decreasing']].groupby('column')['timestamp'].count()
    increase_count = df[df['increasing']].groupby('column')['timestamp'].count()
    decrease_count = df[df['decreasing']].groupby('column')['timestamp'].count()
    # note last row of column or ones which stay same are neither increasing nor decreasing
    # we should be checking there are a valid number of batches
    # Do 90% of the batches increase in value
    changing = (increase_count / changing_count)[lambda x: x > 0.90]
    # Do 90% of the batches decrease in value
    changing = changing + (decrease_count / changing_count)[lambda x: x > 0.90]
    return changing.index.tolist()


class ChangingContinuous(ConditionDetector):
    condition = 'changing_continuous'
    summary = '90% increasing/decreasing median or mean'
    required_data = ['diagnostic_batches', 'diagnostic_profile']

    def _check_p25_p75(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # A very crude detector - does the first batch median fall within the last batch p25-p75?
        grouped = data.diagnostic_batches.groupby('column')
        changing = []
        for col, group in grouped:
            first_median = group['median'].head(1).values[0]
            last_median = group['median'].tail(1).values[0]
            last_p25 = group['quantile_25'].tail(1).values[0]
            last_p75 = group['quantile_75'].tail(1).values[0]
            # Detector is suspect with very narrow ranges... what's a good tolerance?
            if ((first_median < last_p25 and not isclose(last_median, last_p25, rel_tol=1e-4)) or
                    (first_median > last_p75 and not isclose(last_median, last_p75, rel_tol=1e-4))):
                changing.append(col)

        if len(changing) > 0:
            return Condition(self, columns=changing)
        return None

    def _check_each_median(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Do 90% of the medians or means increase or decrease in value
        chg_cols = changing_cols('median', data) + changing_cols('mean', data)
        cols = pd.unique(pd.Series(chg_cols)).tolist() if len(chg_cols) > 0 else []
        if len(cols) > 0:
            return Condition(self, columns=cols)
        return None

    def check(self, analyzer: Analyzer, data: DiagnosticData) -> Optional[Condition]:
        # Apply a crude 'nearly all increasing/decreasing'
        condition = self._check_each_median(analyzer, data)
        # Disabling this because it performs badly on columns which are mostly null
        # If needed, reenable the quantile metrics in standard_diagnostic_metrics
        # if condition is None:
        #    condition = self._check_p25_p75(analyzer, data)
        return condition

    def matches_analyzer(self, analyzer: Analyzer):
        return is_statistical_metric(analyzer.config.metric)
