from enum import Enum
from typing import Union, Dict

from whylabs_toolkit.monitor.models import SimpleColumnMetric, DatasetMetric, ComplexMetrics

# is there a way to make this into an actual union enum so we can do AnalysisMetric.unique_est
AnalysisMetric = Union[SimpleColumnMetric, DatasetMetric, ComplexMetrics]


class MetricCategory(str, Enum):
    performance = "Performance"
    data_quality = "DataQuality"
    data_drift = "DataDrift"
    ingestion = "Ingestion"


SemanticType = str  # define
TypeHints = Dict[str, SemanticType]

