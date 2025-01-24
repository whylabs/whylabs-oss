from typing import List, Dict, Optional

import pandas as pd
from whylabs_toolkit.monitor.models import (
    Analyzer,
    SegmentTag,
    EntitySchema, Segment,
)

from whylabs_toolkit.monitor.diagnoser.models import FailureRecord, DiagnosticDataSummary, AnalysisResultsSummary, \
    ProfileSummary, BatchesSummary, AnomalyRecord, ResultRecord, NamedCount
from smart_config.server.diagnosis.condition import Condition
from smart_config.server.diagnosis.quality_issue import QualityIssue
from whylabs_toolkit.monitor.diagnoser.targeting import targeted_columns


def convert_analysis_result(result: dict) -> dict:
    if not result.get('threshold'):
        return result
    updated = result.copy()
    del updated['threshold']
    # flatten out threshold
    threshold = result.get('threshold', {})
    updated['metric_value'] = threshold.get('threshold_metricValue', None)
    upper_field = next((k for k in threshold.keys() if k.startswith('threshold') and k.endswith('Upper')), None)
    lower_field = next((k for k in threshold.keys() if k.startswith('threshold') and k.endswith('Lower')), None)
    updated['threshold_upper'] = None if upper_field is None else threshold[upper_field]
    updated['threshold_lower'] = None if lower_field is None else threshold[lower_field]
    return updated


class DiagnosticData:
    def __init__(self, analyzer: Analyzer, num_batches: int, granularity: str, interval: str,
                 segment: List[SegmentTag]):
        self.analyzer = analyzer
        self._analyzed_columns = None
        self._anomalies_by_col = None
        self._batches_by_col = None
        self._failed_results = None
        self._nonfailed_results = None
        self.diagnostic_profile = None
        self.diagnostic_batches = None
        self.diagnostic_segment = segment
        self.noisy_feature_summary = None
        self.schema: Optional[EntitySchema] = None
        self.granularity = granularity
        self.interval = interval
        self.num_batches = num_batches
        self.conditions: List[Condition] = []
        self.issues: List[QualityIssue] = []

    @property
    def analysis_results(self):
        return self._nonfailed_results

    @property
    def failed_results(self):
        return self._failed_results

    @property
    def anomaly_count_by_col(self) -> pd.Series:
        return self._anomalies_by_col

    @property
    def cols_with_anomalies(self) -> pd.Series:
        return self._anomalies_by_col[self._anomalies_by_col > 0]

    @property
    def batch_count_by_col(self) -> pd.Series:
        return self._batches_by_col

    def targeted_columns(self):
        if self.schema is None:
            raise Exception('No schema provided so cannot determine targeted columns')
        return targeted_columns(self.analyzer.targetMatrix, self.schema)

    def diagnosed_columns(self) -> List[str]:
        if self.analysis_results is None:
            raise Exception('No analysis results provided so cannot determine diagnosed columns')
        return self.analysis_results['column'].unique().tolist()

    def columns_with_anomaly_pct(self, fraction=0.5) -> List[str]:
        diagnosed = self.diagnosed_columns()
        columns: List[str] = []
        for col in diagnosed:
            col_data = self.analysis_results[self.analysis_results['column'] == col]
            anomaly_count = col_data['anomalyCount'].sum()
            if anomaly_count > fraction * col_data.shape[0]:
                columns.append(col)
        return columns

    def analyzed_batches(self) -> List[int]:
        if self.analysis_results is None:
            raise Exception('No analysis results provided so cannot determine analyzed batches')
        return pd.unique(self.analysis_results['datasetTimestamp']).tolist()

    def failed_columns(self) -> List[int]:
        if self.failed_results is None:
            raise Exception('No analysis results provided so cannot determine failed columns')
        if len(self.failed_results) == 0:
            return []
        return pd.unique(self.failed_results['column']).tolist()

    def failed_batches(self) -> List[int]:
        if self.failed_results is None:
            raise Exception('No analysis results provided so cannot determine failed batches')
        if len(self.failed_results) == 0:
            return []
        return pd.unique(self.failed_results['datasetTimestamp']).tolist()

    def set_analysis_results(self, results: List[dict]):
        # only save if there is any data, to simplify missing data check
        if len(results) and len(results[0].keys()):
            converted = [convert_analysis_result(r) for r in results]
            df = pd.DataFrame.from_records(converted)
            for field in ['failureType', 'column']:
                if field not in df.columns:
                    df[field] = None
            self._nonfailed_results = df[df['failureType'].isnull()]
            self._failed_results = df[df['failureType'].notnull()]
            if len(self._nonfailed_results) == 0:
                # detectors should only need to guard against None (deliberately different from failed results)
                self._nonfailed_results = None
            self._analyzed_columns = df['column'].unique().tolist()
            anomalies = self.analysis_results[self.analysis_results['anomalyCount'] > 0]
            self._anomalies_by_col = anomalies.groupby('column')['anomalyCount'].sum().sort_values(ascending=False)
            self._anomalies_by_col.rename('anomalies')
            self._batches_by_col = self.analysis_results.groupby('column')['datasetTimestamp'].nunique()
            self._batches_by_col.rename('batches')

    def set_diagnostic_profile(self, results: List[Dict]):
        if len(results) and len(results[0].keys()):
            self.diagnostic_profile = pd.DataFrame.from_records(results)
            self.diagnostic_profile['column'] = self.diagnostic_profile['column'].fillna('__internal__.datasetMetrics')

    def set_diagnostic_batches(self, results: List[Dict]):
        if len(results) and len(results[0].keys()):
            self.diagnostic_batches = pd.DataFrame.from_records(results)
            self.diagnostic_batches['column'] = self.diagnostic_batches['column'].fillna('__internal__.datasetMetrics')

    def set_schema(self, schema):
        self.schema = schema

    def describe_analysis_results(self) -> ResultRecord:
        if self.analysis_results is None:
            raise Exception('No analysis results provided so cannot determine results')
        return ResultRecord(
            diagnosedColumnCount=len(self.diagnosed_columns()),
            batchCount=int(self._batches_by_col.max()))

    def describe_anomalies(self) -> AnomalyRecord:
        if self.analysis_results is None:
            raise Exception('No analysis results provided so cannot determine anomalies')
        counts = self.cols_with_anomalies
        batch_count = len(self.analyzed_batches())
        max_count = int(counts.max())
        mean_count = float(counts.mean())
        return AnomalyRecord(totalAnomalyCount=int(counts.sum()), maxAnomalyCount=max_count,
                             meanAnomalyCount=mean_count, batchCount=batch_count,
                             # tolist is needed to convert from int64 to serializable int
                             byColumnCount=[NamedCount(name=n, count=c) for n, c in
                                            list(zip(counts.index, counts.values.tolist()))],
                             byColumnBatchCount=[NamedCount(name=n, count=c) for n, c in list(
                                 zip(self.batch_count_by_col.index, self.batch_count_by_col.values.tolist()))])

    def describe_failures(self) -> FailureRecord:
        if self.failed_results is not None and len(self.failed_results) > 0:
            failures = self.failed_results.groupby(['column'])['failureType'].count().sort_values(ascending=False)
            failure_types = self.failed_results.groupby(['failureType'])['column'].count().sort_values(ascending=False)
            return FailureRecord(totalFailuresCount=len(failures),
                                 maxFailuresCount=int(failures.max()),
                                 meanFailuresCount=int(failures.mean()),
                                 # tolist is needed to convert from int64 to serializable int
                                 byColumnCount=[NamedCount(name=n, count=c) for n, c in
                                                list(zip(failures.index, failures.values.tolist()))],
                                 byTypeCount=[NamedCount(name=n, count=c) for n, c in
                                              list(zip(failure_types.index, failure_types.values.tolist()))])
        return FailureRecord(totalFailuresCount=0, maxFailuresCount=0, meanFailuresCount=0, byColumnCount=[],
                             byTypeCount=[])

    def describe_diagnostic_batches(self) -> Optional[BatchesSummary]:
        if self.diagnostic_batches is not None:
            count_by_col = self.diagnostic_batches.groupby(['column'])['timestamp'].count()
            min_batches = count_by_col[count_by_col == count_by_col.min()]
            max_batches = count_by_col[count_by_col == count_by_col.max()]
            return BatchesSummary(minBatchName=min_batches.index[0], minBatchCount=int(min_batches.iloc[0]),
                                  maxBatchName=max_batches.index[0], maxBatchCount=int(max_batches.iloc[0]))
        return None

    def describe_diagnostic_profile(self) -> Optional[ProfileSummary]:
        if self.diagnostic_profile is not None and 'count' in self.diagnostic_profile.columns:
            count_by_col = self.diagnostic_profile.groupby(['column'])['count'].sum()
            min_rows = count_by_col[count_by_col == count_by_col.min()]
            max_rows = count_by_col[count_by_col == count_by_col.max()]
            return ProfileSummary(minRowName=min_rows.index[0], minRowCount=int(min_rows.iloc[0]),
                                  maxRowName=max_rows.index[0], maxRowCount=int(max_rows.iloc[0]))
        return None

    def summarize(self) -> DiagnosticDataSummary:
        return None if self.analysis_results is None else DiagnosticDataSummary(
            diagnosticSegment=Segment(tags=self.diagnostic_segment),
            diagnosticProfile=self.describe_diagnostic_profile(),
            diagnosticBatches=self.describe_diagnostic_batches(),
            targetedColumnCount=len(self.targeted_columns()),
            analysisResults=AnalysisResultsSummary(
                results=self.describe_analysis_results(),
                failures=self.describe_failures(),
                anomalies=self.describe_anomalies()
            )
        )
