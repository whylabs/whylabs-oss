from typing import Union

from whylabs_toolkit.monitor.models import (
    DatasetMetric,
    SimpleColumnMetric,
    ComplexMetrics,
)

AnalysisMetric = Union[SimpleColumnMetric, DatasetMetric, ComplexMetrics]