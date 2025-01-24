from whylabs_toolkit.monitor.models import DatasetMetric, SimpleColumnMetric

from smart_config.server.dataservice.converters.metrics import analyzer_to_ds_metric


def test_analyzer_to_ds_metric():
    assert analyzer_to_ds_metric(DatasetMetric.classification_f1) == 'classification_f1'
    assert analyzer_to_ds_metric(DatasetMetric.classification_f1) != DatasetMetric.classification_f1.value
    assert analyzer_to_ds_metric(DatasetMetric.regression_rmse) == 'regression_rmse'
    assert analyzer_to_ds_metric(SimpleColumnMetric.unique_est) == SimpleColumnMetric.unique_est.value
