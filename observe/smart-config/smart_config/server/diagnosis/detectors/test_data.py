from typing import Optional

from whylabs_toolkit.monitor.models import Analyzer

from whylabs_toolkit.monitor.diagnoser.constants import DEFAULT_BATCHES
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


def gen_analyzer(metric='mean', config: Optional[dict] = None,
                 target_matrix: Optional[dict] = None, baseline: Optional[dict] = None):
    target_matrix = {'type': 'column', 'include': ['col1']} if target_matrix is None else target_matrix
    config = {'type': 'fixed', 'metric': metric, 'upper': 1.0} if config is None else config
    if config['type'] != 'fixed':
        config['baseline'] = {'type': 'TrailingWindow', 'size': 7} if baseline is None else baseline
    return Analyzer.parse_obj(
        {
            'id': 'test_analyzer',
            'config': config,
            'targetMatrix': target_matrix,
        })


def gen_diagnostic_data(analyzer=None, num_batches=DEFAULT_BATCHES, granularity='daily', interval='2023-11-01/2023-12-01',
                        segment=None):
    analyzer = gen_analyzer() if analyzer is None else analyzer
    return DiagnosticData(analyzer, num_batches, granularity, interval, segment)


# generate a dict with example results fields that can be basis for test data
# drops ids etc that arent likely useful for diagnosis
def gen_result_dict(fields: Optional[dict] = None) -> dict:
    return {
        'column': 'col1',
        'segment': '',
        'creationTimestamp': 1671496783670,
        'datasetTimestamp': 1671235200000,
        'targetLevel': 'column',
        'anomalyCount': 0,
        'targetCount': 1,
        'targetBatchesWithProfileCount': 1,
        'baselineCount': 5,
        'baselineBatchesWithProfileCount': 5,
        'expectedBaselineCount': 7,
        'expectedBaselineSuppressionThreshold': 3,
        'isRollup': True,
        'metric': 'histogram',
        'algorithm': 'hellinger',
        'analyzerType': 'drift',
        'algorithmMode': 'histogram',
        # We're currently not extracting the analyzer-specific fields, but may need to in future
        # 'drift': {'drift_metricValue': 0.6062544581001645, 'drift_threshold': 0.7},
        'analyzerResultType': 'DriftCalculationResult',
        **(fields if fields else {})
    }


# generate a dict with example profile fields for a single column that can be basis for test data
# drops ids etc that arent likely useful for diagnosis
# Only includes a subset of possible metrics that are currently retrieved... update if we add more but
# current impl is linear in number
def gen_float_col_dict(fields: Optional[dict] = None) -> dict:
    return {
        'timestamp': 1671235200000,
        'column': 'col1',
        'count': 7000.0,
        'last_upload_ts': 1671466888000,
        'unique_est': 2.000000004967054,
        'quantile_25': 2.222,
        'count_null': 0.0,
        'median': 2.222,
        'quantile_75': 3.333,
        'mean': 2.698142857142857,
        'unique_est_ratio': 0.00028571428642386483,
        **(fields if fields else {})
    }


def gen_text_col_dict(fields: Optional[dict] = None) -> dict:
    return {
        'column': 'string',
        'count': 7000.0,
        'count_null': 0.0,
        'last_upload_ts': 1671466888000,
        'mean': 0.0,
        'timestamp': 1671235200000,
        'unique_est': 2.000000004967054,
        'unique_est_ratio': 0.00028571428642386483,
        **(fields if fields else {})
    }