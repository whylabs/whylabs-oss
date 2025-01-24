from typing import List, Optional, Union

from whylabs_toolkit.monitor.models import TimeRange, SegmentTag

from smart_config.server.dataservice.constants import MAX_ANALYSIS_RESULTS
from smart_config.server.dataservice.converters.metrics import (
    analyzer_to_ds_metric,
    analyzer_to_new_ds_metric,
    new_ds_to_analyzer_metric,
)
from smart_config.server.dataservice.types import AnalysisMetric
from smart_config.server.service.service_wrapper import ServiceWrapper


def safe_parse(val: Union[str, float, int]) -> Optional[Union[float, int]]:
    if isinstance(val, (float, int)):
        return val
    return None


class DataService(ServiceWrapper):
    default_url = 'http://dataservice-main-k8s.datastack.dev.whylabs'
    # default_url = 'http://localhost:8090'

    def get_batch_timestamps(self, org_id: str, dataset_id: str, interval: str, granularity: str, segment=None) -> List[
        int]:
        data = self._post(
            'profiles/timeSeries',
            {
                'orgId': org_id,
                'datasetIds': [dataset_id],
                'granularity': granularity,
                'interval': interval,
                'segment': segment
            },
        )
        return [d.get('ts') for d in data]

    def get_lineage(self, org_id: str, dataset_id: str) -> Optional[TimeRange]:
        data = self._post(
            '/profiles/timeBoundary',
            {
                'orgId': org_id,
                'datasetIds': [dataset_id],
            },
        )
        try:
            result = next(r for r in data.get('rows', []) if r.get('datasetId') == dataset_id)
        except StopIteration:
            return None
        time_range = TimeRange(start=result.get('start'), end=result.get('end'))
        return time_range

    def get_analyzers_diagnostic_summary(self, org_id: str, dataset_id: str, interval: str) -> dict:
        data = self._post(
            '/diagnostic/analyzers',
            {
                'orgId': org_id,
                'datasetId': dataset_id,
                'interval': interval,
            }
        )

        return data

    def get_analyzer_segments_summary(self, org_id: str, dataset_id: str, analyzer_id: str, interval: str) -> dict:
        data = self._post(
            '/diagnostic/analyzer/segments',
            {
                'orgId': org_id,
                'datasetId': dataset_id,
                'analyzerId': analyzer_id,
                'interval': interval,
            }
        )

        return data

    def get_analyzer_segment_columns_summary(self, org_id: str, dataset_id: str, analyzer_id: str, segment: str,
                                             interval: str) -> dict:
        data = self._post(
            '/diagnostic/analyzer/segment/columns',
            {
                'orgId': org_id,
                'datasetId': dataset_id,
                'analyzerId': analyzer_id,
                'segment': segment,
                'interval': interval,
            }
        )

        return data

    def get_late_upload_analysis(self, org_id: str, dataset_id: str) -> dict:
        data = self._get(
            f'diagnostic/uploadPatterns/{org_id}/{dataset_id}'
        )

        return data

    def get_rollup(self, org_id: str, dataset_id: str, interval: str, columns: List[str], metrics: List[AnalysisMetric],
                   granularity='all', segment: List[SegmentTag] = None) -> List[dict]:
        # may be called with an empty list of metrics
        if len(metrics) == 0:
            return []

        # assemble data by col, ts
        col_profiles = {}
        # query in batches of 10 columns to avoid hitting timeouts
        from_index = 0

        def get_profiles(cols: Optional[List[str]]):
            selectors = [{'datasetId': dataset_id, 'metric': analyzer_to_ds_metric(m), 'columnNames': cols} for
                         m in metrics]
            data = self._post(
                '/profiles/numericMetricsForTimeRange',
                {
                    'orgId': org_id,
                    'datasetId': dataset_id,
                    'datasetColumnSelectors': selectors,
                    'interval': interval,
                    'segment': [] if segment is None else [tag.dict() for tag in segment],
                    'granularity': granularity,
                },
            )
            for r in data:
                for col, col_data in r.get('features').items():
                    ts = r.get('timestamp')
                    if col_profiles.get((col, ts), None) is None:
                        col_profiles[(col, ts)] = {'dataset_id': r.get('datasetId'), 'timestamp': ts, 'column': col}
                    col_profile = col_profiles.get((col, ts), None)
                    col_profile.update(col_data.get('type_double', {}))
                    upload_ts = col_data.get('type_long', {}).get('whylabs/last_upload_ts')
                    if col_profile.get('last_upload_ts', None) is None or upload_ts > col_profile['last_upload_ts']:
                        col_profile['last_upload_ts'] = upload_ts

        if columns is None:
            get_profiles(None)
        else:
            for batch_of_cols in columns[from_index:from_index + 10]:
                if len(batch_of_cols) == 0:
                    break
                from_index += 10
                get_profiles(batch_of_cols)
        return list(col_profiles.values())

    def get_metrics(self, org_id: str, dataset_id: str, interval: str, columns: List[str],
                    metrics: List[AnalysisMetric], granularity='all', segment: List[SegmentTag] = None) -> List[dict]:
        # assemble results in a map from (col, ts) to dataset_id, timestamp, column, metric_name: value
        col_profiles = {}
        metrics_values = [str(m.value) for m in metrics]

        def add_to_col_profiles(col, timestamp, analyzer_metric, val, last_modified: Optional[int]):
            if col_profiles.get((col, ts), None) is None:
                col_profiles[(col, ts)] = {
                    'dataset_id': dataset_id,
                    'timestamp': timestamp,
                    'column': col,
                    analyzer_metric: val
                }
            col_profile: dict = col_profiles.get((col, ts))
            col_profile.update({analyzer_metric: val})
            if last_modified and (col_profile.get('last_upload_ts', None) is None
                                  or last_modified > col_profile['last_upload_ts']):
                col_profile['last_upload_ts'] = last_modified

        # metric names needed in queries
        new_ds_metrics = set()

        # map the analyzer metrics to the dataservice metrics
        for m in metrics_values:
            new_m = analyzer_to_new_ds_metric(m)
            if new_m is not None:
                # it's a built in
                new_ds_metrics.add(new_m)

        segment_dicts = [] if segment is None else [tag.dict() for tag in segment]

        # do one query per column as this should stay under the 10 metrics per request limit
        for column in ([None] if columns is None else columns):
            queries = []
            # create timeseries queries for all the built-in metrics
            for i, m in enumerate(list(new_ds_metrics)):
                query = {
                    'queryId': f'q{str(i)}',
                    'resourceId': dataset_id,
                    'columnName': column,
                    'segment': segment_dicts,
                    'metric': m,
                }
                if column is None:
                    query.pop('columnName')
                queries.append(query)

            req = {
                'rollupGranularity': granularity,
                'interval': interval,
                'timeseries': queries,
            }
            data = self._post(
                f'/metrics/timeseries/{org_id}',
                req,
            )

            # process the built-in query results
            for r in data.get('timeseries'):
                for entry in r.get('data'):
                    query = next((q for q in queries if q['queryId'] == r['id']), None)
                    if query is None:
                        continue
                    ts = entry.get('timestamp')
                    value = safe_parse(entry.get('value'))
                    # Map back to original analysis metric
                    metric = new_ds_to_analyzer_metric(query.get('metric'))
                    if metric in metrics:
                        add_to_col_profiles(column, ts, metric, value, entry.get('lastModified'))

        return list(col_profiles.values())

    def get_metrics_rollup(self, org_id: str, dataset_id: str, interval: str, columns: List[str],
                           metrics: List[AnalysisMetric], granularity='all', segment: List[SegmentTag] = None) -> List[
        dict]:
        # reenable if we have to get some metrics from profile rollup
        # rollup_metrics = [m for m in metrics if m.value not in supported_metrics()]
        # results = self.get_metrics(org_id, dataset_id, interval, columns, metrics, granularity, segment) + \
        #     self.get_rollup(org_id, dataset_id, interval, columns, rollup_metrics, granularity, segment)
        # return self.get_rollup(org_id, dataset_id, interval, columns, metrics, granularity, segment)
        return self.get_metrics(org_id, dataset_id, interval, columns, metrics, granularity, segment)

    def get_batched_rollup(self, org_id: str, dataset_id: str, interval: str, columns: List[str],
                           metrics: List[AnalysisMetric], granularity='all', segment: List[SegmentTag] = None) -> List[
        dict]:
        results = []
        for m in metrics:
            results = results + self.get_rollup(org_id, dataset_id, interval, columns, metrics, granularity, segment)
        return results

    def get_analysis_results(self, org_id: str, dataset_id: str, analyzer_id: str, interval: str,
                             segment: str = None, columns: List[str] = None) -> List[dict]:
        data = self._post(
            '/analysis/getAnalyzerResults',
            {
                'orgId': org_id,
                'datasetIds': [dataset_id],
                'analyzerIds': [analyzer_id],
                'interval': interval,
                'includeUnhelpful': True,
                'includeFailures': True,
                'onlyAnomalies': False,
                'segments': None if segment is None else [segment],
                'columnNames': None if columns is None else columns,
                'limit': MAX_ANALYSIS_RESULTS
            },
        )

        return data
