import pandas as pd
import os
from typing import List, Union, Optional

from whylabs_toolkit.helpers.config import UserConfig
from whylabs_toolkit.helpers.utils import get_monitor_api, get_models_api
from whylabs_toolkit.monitor.models import Analyzer, ColumnMatrix, DatasetMatrix, TargetLevel, SimpleColumnMetric, \
    SegmentTag

from whylabs_toolkit.monitor.diagnoser.converters.granularity import calculate_num_batches
from whylabs_toolkit.helpers.monitor_helpers import time_period_to_granularity
from whylabs_toolkit.monitor.diagnoser.helpers.utils import segment_to_text
from whylabs_toolkit.monitor.diagnoser.models import AnalyzerDiagnosisReport, ConditionRecord, QualityIssueRecord
from smart_config.server.dataservice.dataservice import DataService
from smart_config.server.diagnosis.analyzer_matchers import is_supported_rollup_metric
from whylabs_toolkit.monitor.diagnoser.constants import MAX_COLUMNS
from smart_config.server.diagnosis.registry.detector_registry import DetectorRegistry
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData
from whylabs_toolkit.monitor.diagnoser.helpers.describe import describe_truncated_table, filter_by_index

# the standard metrics to use
# Note: query time currently scales with number of metrics - we may need to move to using
# profile rollup endpoint and doing our own mapping to metric names
standard_diagnostic_metrics = {
    SimpleColumnMetric.count,
    SimpleColumnMetric.count_null,
    SimpleColumnMetric.mean,
    SimpleColumnMetric.median,
    SimpleColumnMetric.unique_est,
    SimpleColumnMetric.unique_est_ratio
}


class AnalyzerDiagnoser:
    def __init__(self, org_id: str, dataset_id: str, analyzer_id: str, interval: str, api_key: str):
        self.org_id = org_id
        self.dataset_id = dataset_id
        self.analyzer_id = analyzer_id
        self.interval = interval
        self._granularity = None
        self.data: Optional[DiagnosticData] = None
        self.analyzer_id = analyzer_id
        self._analyzer = None
        self.conditions = None
        self.quality_issues = None
        self._data_svc = DataService(options={'url': os.environ.get('DATA_SERVICE_API_ENDPOINT')})
        api_endpoint = os.environ.get('SONGBIRD_API_ENDPOINT', os.environ.get('WHYLABS_API_ENDPOINT'))
        self._api_config = UserConfig(api_key=api_key, org_id=self.org_id, dataset_id=self.dataset_id,
                                      whylabs_host=api_endpoint)

    @property
    def analyzer(self) -> Analyzer:
        if self._analyzer is None:
            monitor_api = get_monitor_api(self._api_config)
            self._analyzer = Analyzer.parse_obj(monitor_api.get_analyzer(
                org_id=self.org_id, dataset_id=self.dataset_id, analyzer_id=self.analyzer_id))
        return self._analyzer

    @property
    def data_svc(self) -> DataService:
        if self._data_svc is None:
            raise Exception('Please set environment variable DATA_SERVICE_API_ENDPOINT')
        return self._data_svc

    @property
    def granularity(self) -> Analyzer:
        if self._granularity is None:
            model_api = get_models_api(self._api_config)
            resp = model_api.get_model(self.org_id, self.dataset_id)
            self._granularity = time_period_to_granularity(resp.time_period)
        return self._granularity

    @property
    def num_batches(self) -> int:
        return calculate_num_batches(self.interval, self.granularity)

    def assemble_data(self, diagnostic_segment: List[SegmentTag], columns_to_diagnose: List[str]) -> DiagnosticData:
        self.data = DiagnosticData(self.analyzer, self.num_batches, self.interval, self.granularity, diagnostic_segment)
        models_api = get_models_api(self._api_config)
        self.data.schema = models_api.get_entity_schema(org_id=self.org_id, dataset_id=self.dataset_id)
        segment = segment_to_text(self.data.diagnostic_segment)
        columns = columns_to_diagnose[:MAX_COLUMNS]
        self.data.set_analysis_results(
            self.data_svc.get_analysis_results(self.org_id, self.dataset_id, self.analyzer_id,
                                          self.interval, segment, columns=columns))
        config = self.analyzer.config
        target_matrix: Union[ColumnMatrix, DatasetMatrix] = self.analyzer.targetMatrix
        metric = config.metric
        # special case for integration metrics
        if metric in ['missingDatapoint', 'secondsSinceLastUpload'] and self.data.schema is not None:
            # Can we use a subset of upload patterns dataservice diagnostics to help with analysis for these cases
            # upload_analysis = data_svc.get_late_upload_analysis(self.org_id, self.dataset_id)
            # retrieve some profile data to work with
            columns = list(self.data.schema.columns.keys())[0:MAX_COLUMNS]
            metrics = {SimpleColumnMetric.count}  # most basic metric to let us do stale analysis check
        else:
            # some metrics are not supported for rollup
            metrics = {metric} if is_supported_rollup_metric(metric) else set()
            if target_matrix.type == TargetLevel.column:
                columns = list(self.data.anomaly_count_by_col.index[0:MAX_COLUMNS])
                metrics.update(standard_diagnostic_metrics)
            else:
                columns = None
        metrics = list(metrics)
        self.data.set_diagnostic_profile(self.data_svc.get_metrics_rollup(
            self.org_id, self.dataset_id, self.interval, columns, metrics, 'all', self.data.diagnostic_segment))
        self.data.set_diagnostic_batches(
            self.data_svc.get_metrics_rollup(self.org_id, self.dataset_id, self.interval, columns, metrics, self.granularity,
                                self.data.diagnostic_segment))
        return self.data

    def run_detectors(self):
        # get the relevant detectors
        detectors = DetectorRegistry.get_detectors_for_analyzer(self.analyzer)
        self.conditions = []
        self.quality_issues = []
        for detector in detectors:
            # check for quality issues
            self.quality_issues.extend(detector.quality_check(self.analyzer, self.data))

            # if required data is missing, don't run the detector
            if len(detector.missing_data(self.analyzer, self.data)) > 0:
                continue

            # and then run the check itself
            diagnosed = detector.check(self.analyzer, self.data)
            if diagnosed is not None:
                self.conditions.append(diagnosed)

    def summarize_diagnosis(self) -> AnalyzerDiagnosisReport:
        return AnalyzerDiagnosisReport(
            orgId=self.org_id,
            datasetId=self.dataset_id,
            analyzerId=self.analyzer_id,
            expectedBatchCount=self.num_batches,
            interval=self.interval,
            granularity=self.granularity,
            diagnosticData=self.data.summarize(),
            qualityIssues=self.describe_quality_issues(),
            conditions=self.describe_conditions(),
        )

    def describe_quality_issues(self) -> List[QualityIssueRecord]:
        if len(self.quality_issues) == 0:
            return []
        by_issue = {}
        for issue in self.quality_issues:
            res = by_issue.get(issue.name, None)
            if res is None:
                res = {"desc": issue.describe(), "detectors": []}
            if issue.detector_name not in res.get('detectors'):
                res.get('detectors').append(issue.detector_name)
            by_issue[issue.name] = res
        issues = []
        for k, v in by_issue.items():
            issues.append(QualityIssueRecord.parse_obj({"name": k, "description": v.get('desc'), "detectors": v.get("detectors")}))
        return issues

    def describe_conditions(self) -> List[ConditionRecord]:
        if len(self.conditions) == 0:
            return []
        description = 'Conditions that may contribute to noise include:'
        cols = []
        for condition in self.conditions:
            description += condition.describe()
            if condition.columns is not None:
                cols += condition.columns

        cols = pd.Series(cols).unique()
        if len(cols) > 0:
            description += f'\nAnomalies for columns with these conditions:\n'
            cols_with_count = filter_by_index(cols.tolist(), self.data.anomaly_count_by_col).sort_values(ascending=False)
            cols_with_count.rename('anomalies')
            description += describe_truncated_table(cols_with_count)
            description += (f'\nAccounting for {cols_with_count.sum()} anomalies out of '
                            f'{self.data.anomaly_count_by_col.sum()}\n')

        return [ConditionRecord(name=c.name, info=c.info, summary=c.summarize(), columns=c.columns) for c in
                self.conditions]
