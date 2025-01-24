from enum import Enum

from whylabs_toolkit.monitor.models import (
    DatasetMetric,
    SimpleColumnMetric,
    Analyzer,
    BaselineType,
    AlgorithmType,
)

from smart_config.server.dataservice.converters.metrics import AnalysisMetric


def is_model_metric(m: AnalysisMetric):
    if not isinstance(m, Enum):
        return False
    return m.value.startswith('regression') or m.value.startswith('classification')


def is_supported_rollup_metric(m: AnalysisMetric):
    return (m in SimpleColumnMetric and m != SimpleColumnMetric.inferred_data_type) or is_model_metric(m)


def is_integration_metric(m: AnalysisMetric):
    return m == DatasetMetric.missing_data_point or m == 'secondsSinceLastUpload'


def is_statistical_metric(m: AnalysisMetric):
    if not isinstance(m, Enum):
        return False
    return m.value in ['histogram', 'min', 'mean', 'max', 'median'] or m.value.startswith('quantile_')


def is_ratio_metric(m: AnalysisMetric):
    if not isinstance(m, Enum):
        return False
    return m.value.endswith('ratio')


def has_baseline(a: Analyzer):
    return getattr(a.config, 'baseline', None) is not None


def has_no_baseline(a: Analyzer):
    return not has_baseline(a)


def has_trailing_baseline(a: Analyzer):
    return has_baseline(a) and a.config.baseline.type == BaselineType.TrailingWindow


def has_fixed_baseline(a: Analyzer):
    return has_baseline(a) and a.config.baseline.type in [BaselineType.Reference, BaselineType.TimeRange]


def has_threshold_band(a: Analyzer):
    if a.config.type not in [AlgorithmType.diff, AlgorithmType.stddev, AlgorithmType.fixed]:
        return False

    if a.config.type == AlgorithmType.fixed and (a.config.upper is not None and a.config.lower is not None):
        return True

    if getattr(a.config, 'thresholdType', None) is None or a.config.thresholdType is None:
        return True

    return False
