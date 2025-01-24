from typing import Optional, List

from smart_config.server.dataservice.types import AnalysisMetric


def analyzer_to_ds_metric(metric: AnalysisMetric) -> str:
    # need to replace the . with _ in dataset metric names
    value: str = str(metric.value)
    for prefix in ['classification.', 'regression.']:
        if value.startswith(prefix):
            return prefix[:-1] + '_' + value[len(prefix):]
    return value


same_name_metrics = [
    'count',
    'median',
    'max',
    'min',
    'mean',
    'std_dev',
    'variance',
    'unique_upper',
    # 'unique_upper_ratio,  # not impl
    'unique_est',
    'unique_est_ratio',
    'unique_lower',
    # 'unique_lower_ratio', # not impl

    # data type counts and ratios
    'count_bool',
    'count_bool_ratio',
    'count_integral',
    'count_integral_ratio',
    'count_fractional',
    'count_fractional_ratio',
    'count_string',
    'count_string_ratio',

    # also missing values
    'count_null',
    'count_null_ratio',

    # this is a string metric
    # 'inferred_data_type',

    # quantiles
    'quantile_5',
    'quantile_75',
    'quantile_25',
    'quantile_90',
    'quantile_95',
    'quantile_99',

    # classification metrics
    'classification_f1',
    'classification_precision',
    'classification_recall',
    'classification_accuracy',
    'classification_auc',
    'classification_auroc',
    'classification_fpr',

    # regression metrics
    'regression_mse',
    'regression_mae',
    'regression_rmse',

    'prediction_count',
]

# Built-in metrics map to DS API names
map_to_new_metric: dict = {m: m for m in same_name_metrics}
map_to_new_metric.update({
    # 'name_in_analyzer': 'name_in_dataservice'
})


def analyzer_to_new_ds_metric(metric: str) -> Optional[str]:
    return map_to_new_metric.get(metric, metric)


def new_ds_to_analyzer_metric(metric: str) -> Optional[str]:
    return next((m for m in map_to_new_metric.keys() if map_to_new_metric.get(m) == metric), metric)


def supported_metrics() -> List[str]:
    return list(map_to_new_metric.keys())
